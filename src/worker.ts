import { Worker, Job } from 'bullmq';
import { connection } from './config/redis';
import { renderPDF } from './renderers';
import { SecurityService } from './services/security';
import { HtmlBuilder } from './services/html-builder';
import { TemplateEngine } from './services/template-engine';
import { AssetHandler } from './services/asset-handler';
import { PdfJob } from './models/PdfJob';
import { TrafficLimiter } from './middleware/traffic-limiter';
import { incrementPdfCounters } from './middleware/pdf-counter';

interface RenderJobData {
  jobId: string;
  html: string;
  css: string;
  javascript: string;
  renderer: 'weasyprint' | 'pagedjs' | 'vivliostyle';
  assets?: string;
  data?: Array<Record<string, any>>;
}

const templateEngine = new TemplateEngine();
const assetHandler = new AssetHandler();

const worker = new Worker<RenderJobData>(
  'pdf-rendering',
  async (job: Job<RenderJobData>) => {
    const { jobId, html, css, javascript, renderer, assets, data } = job.data;

    try {
      // Update status to in_progress
      await PdfJob.updateStatus(jobId, 'in_progress');

      // ===================================
      // 1. Security: Clean inputs
      // ===================================
      const sanitized = SecurityService.sanitizeInputs(html, css, javascript);

      // ===================================
      // 2. Build combined HTML
      // ===================================
      let combinedHTML = HtmlBuilder.build(
        sanitized.html,
        sanitized.css,
        sanitized.javascript
      );

      // ===================================
      // 3. Extract and handle assets
      // ===================================
      if (assets) {
        try {
          const assetMap = await assetHandler.extractAssets(assets, jobId);
          combinedHTML = assetHandler.replaceAssetPaths(combinedHTML, assetMap);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          throw new Error(`Asset extraction failed: ${msg}`);
        }
      }

      // ===================================
      // 4. Template rendering (Twig equivalent)
      // ===================================
      const finalHTML = await templateEngine.render(combinedHTML, data);

      // ===================================
      // 5. Render PDF with selected engine
      // ===================================
      job.updateProgress(50);
      const pdfBuffer = await renderPDF(finalHTML, renderer);

      await TrafficLimiter.recordTraffic(pdfBuffer.length);

      // ===================================
      // 6. Cleanup assets
      // ===================================
      if (assets) {
        await assetHandler.cleanup(jobId);
      }

      // ===================================
      // 7. Store result in database
      // ===================================
      await PdfJob.updateWithPDF(jobId, pdfBuffer);

      // Increment aggregated PDF counters
      try {
        await incrementPdfCounters();
      } catch (err) {
        // Non-fatal: log but don't fail the job if counting fails
        console.error('Failed to increment PDF counters:', err);
      }

      job.updateProgress(100);
      return { success: true, size: pdfBuffer.length };

    } catch (error) {
      // Update job status to error
      const msg = error instanceof Error ? error.message : String(error);
      await PdfJob.updateStatus(jobId, 'error', msg);
      
      // Cleanup assets on error
      if (assets) {
        await assetHandler.cleanup(jobId);
      }
      
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process 5 jobs concurrently
    limiter: {
      max: 20,
      duration: 60000 // 20 jobs per minute
    }
  }
);

worker.on('completed', (job) => {
  console.log(`✓ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`✗ Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('PDF Worker started, waiting for jobs...');