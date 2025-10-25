import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { Queue, QueueEvents } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { RenderRequest, RenderOptions } from './types';
import { PdfJob } from './models/PdfJob';
import { connection } from './config/redis';
import { sequelize } from './config/database';
import { TrafficLimiter } from './middleware/traffic-limiter';
import { markdownToHtml } from './services/markdown-builder';

const fastify = Fastify({ 
  logger: true,
  bodyLimit: 10 * 1024 * 1024 // 10MB
});

async function init() {
  await fastify.register(rateLimit, {
    global: true,
    max: 300, // 300 requests
    timeWindow: '1 minute',
    redis: connection,
    nameSpace: 'rl:',
    continueExceeding: true,
    skipOnError: false,
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    errorResponseBuilder: (request, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: context.ttl ? Math.ceil(context.ttl / 1000) : 60,
        limit: context.max,
        remaining: null,
        reset: Math.floor(Date.now() / 1000) + Math.ceil(context.ttl / 1000),
      };
    },
  });

  const pdfQueue = new Queue('pdf-rendering', { connection });
  const queueEvents = new QueueEvents('pdf-rendering', { connection });
  const { getPdfCounts } = await import('./middleware/pdf-counter');

  fastify.get('/health', {
    config: {
      rateLimit: {
        max: 60, // 60 per minute
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    try {
      // Check database
      await sequelize.authenticate();
      
      // Check Redis
      await connection.ping();
  
      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'ok',
          redis: 'ok',
          api: 'ok'
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return reply.code(503).send({
      status: 'unhealthy',
      error: errorMessage
      });
    }
  });
  
  fastify.get('/api/traffic-status', {
    config: {
      rateLimit: {
        max: 60, // 60 per minute
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const usage = await TrafficLimiter.getCurrentUsage();
    const remaining = await TrafficLimiter.getRemainingQuota();
    const percent = await TrafficLimiter.getUsagePercent();
  
  const usageGB = (usage / (1024 ** 3)).toFixed(2);
  const remainingGB = (remaining / (1024 ** 3)).toFixed(2);
  const limitGB = (TrafficLimiter.MAX_BYTES / (1024 ** 3)).toFixed(2);
  const usageTB = (usage / (1024 ** 4)).toFixed(3);
  const limitTB = (TrafficLimiter.CONFIGURED_BYTES / (1024 ** 4)).toFixed(0);
  
    return reply.send({
      usage: {
        bytes: usage,
        gb: parseFloat(usageGB),
        percent: parseFloat(percent.toFixed(2)),
        tb: parseFloat(usageTB)
      },
      remaining: {
        bytes: remaining,
        gb: parseFloat(remainingGB)
      },
      limit: {
        bytes: TrafficLimiter.MAX_BYTES,
        gb: parseFloat(limitGB),
        tb: parseFloat(limitTB)
      },
      status: percent >= 100 ? 'LIMIT_REACHED' : percent >= 90 ? 'WARNING' : 'OK',
      resetDate: getFirstDayOfNextMonth()
    });
  });

  // PDF counters endpoint
  fastify.get('/api/metrics/pdf', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    try {
      const counts = await getPdfCounts();
      return reply.send({ counts });
    } catch (err) {
      request.log.error({ err: String(err) }, 'Failed to read PDF counters');
      return reply.code(500).send({ error: 'Failed to read PDF counters' });
    }
  });
  
  /**
   * Main render endpoint
   * POST /api/render
   */
  fastify.post('/api/render', {
    config: {
      rateLimit: {
        max: 60, // 60 per minute
        timeWindow: '1 minute',
      },
    },
  }, async (
    request: FastifyRequest<{ Body: RenderRequest }>,
    reply: FastifyReply
  ) => {
    const body = request.body;
  
    // CHECK TRAFFIC LIMIT FIRST
    const canGenerate = await TrafficLimiter.canGenerate();
    if (!canGenerate) {
      const usagePercent = await TrafficLimiter.getUsagePercent();
      return reply.code(503).send({
        error: 'Service temporarily unavailable',
        message: 'Monthly traffic limit reached. Service will resume next month.',
        usage: `${usagePercent.toFixed(2)}%`,
        resetDate: getFirstDayOfNextMonth()
      });
    }
  
    // ===================================
    // 1. Check if this is a status query
    // ===================================
    if (body.pdfid) {
      return handleStatusQuery(body.pdfid, reply);
    }
  
    // ===================================
    // 2. Validate required fields: exactly one of `html` or `markdown`
    // ===================================
    const hasHtml = typeof body.html === 'string' && body.html.trim() !== '';
    const hasMd = typeof body.markdown === 'string' && body.markdown.trim() !== '';
    if ((hasHtml && hasMd) || (!hasHtml && !hasMd)) {
      return reply.code(400).send({
        message: 'Provide exactly one of "html" or "markdown" in the request body.'
      });
    }
  
    // ===================================
    // 3. Set default options
    // ===================================
    const options: RenderOptions = {
      renderer: 'weasyprint',
      sync: true
    };
  
    // Override with javascript renderer if javascript is present
    if (body.javascript) {
      options.renderer = 'pagedjs';
    }
  
    // ===================================
    // 4. Process options from request
    // ===================================
    if (body.options) {
      // Validate renderer
      if (body.options.renderer) {
        const validRenderers = ['weasyprint', 'pagedjs', 'vivliostyle'];
        if (!validRenderers.includes(body.options.renderer)) {
          return reply.code(400).send({
            message: 'Invalid Renderer Option passed, valid options are "weasyprint", "pagedjs", and "vivliostyle"'
          });
        }
        options.renderer = body.options.renderer;
      }
  
      // Validate sync option
      if (body.options.sync !== undefined) {
        if (typeof body.options.sync === 'boolean') {
          options.sync = body.options.sync;
        } else if (body.options.sync === 'true' || body.options.sync === 'false') {
          options.sync = body.options.sync === 'true';
        } else {
          return reply.code(400).send({
            message: 'Invalid Sync Option passed, valid options are "true", and "false"'
          });
        }
      }
    }
  
    // ===================================
    // 5. Validate renderer for JavaScript
    // ===================================
    if (body.javascript) {
      if (!['pagedjs', 'vivliostyle'].includes(options.renderer)) {
        return reply.code(400).send({
          message: 'Invalid Renderer Option passed, as the renderer does not support JavaScript use "pagedjs", or "vivliostyle" as renderer'
        });
      }
    }
  
    // ===================================
    // 6. Validate data array if present
    // ===================================
    if (body.data && !Array.isArray(body.data)) {
      return reply.code(400).send({
        message: 'The data key needs to contain an array'
      });
    }
  
    // ===================================
    // 7. Validate assets if present
    // ===================================
    if (body.assets) {
      try {
        Buffer.from(body.assets, 'base64');
      } catch (error) {
        return reply.code(400).send({
          message: 'Can not base64 decode the assets zip file'
        });
      }
    }
  
    // ===================================
    // 8. Prepare HTML (convert markdown if needed) and create job in database
    // ===================================
    let htmlContent = '';
    // Prepare template data: if data is an array, use first element for single-template markdown
    const templateData = body.data && Array.isArray(body.data) ? body.data[0] : (body.data || {});
    if (hasMd && body.markdown) {
      try {
        htmlContent = await markdownToHtml(body.markdown, templateData);
      } catch (err) {
        request.log.error({ err: String(err) }, 'Failed to convert markdown to HTML');
        return reply.code(400).send({ message: 'Failed to convert markdown to HTML' });
      }
    } else {
      htmlContent = body.html ? body.html : '';
    }

    // 9. Create job in database
    // ===================================
    const jobId = uuidv4();
    const pdfJob = await PdfJob.create({
      hash: jobId,
      status: 'open',
      assets: body.assets || null
    });
  
    // ===================================
    // 9. Queue the rendering job
    // ===================================
    const job = await pdfQueue.add('render', {
      jobId: pdfJob.hash,
      html: htmlContent,
      css: body.css || '',
      javascript: body.javascript || '',
      renderer: options.renderer,
      assets: body.assets,
      data: body.data
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: false,
      removeOnFail: false
    });
  
    // ===================================
    // 10. Handle sync vs async
    // ===================================
    if (options.sync) {
      // Wait for job completion
      try {
        await job.waitUntilFinished(queueEvents, 300000); // 5 min timeout
        
        // Fetch result from database
        const completedJob = await PdfJob.findByHash(pdfJob.hash);
        
        if (!completedJob) {
          return reply.code(400).send({
            message: 'Job not found after completion'
          });
        }
  
        if (completedJob.status === 'success') {
          const pdfBuffer = completedJob.pdf;
  
          // Ensure pdfBuffer exists and is a Buffer (or can be measured)
          if (!pdfBuffer) {
            await PdfJob.deleteByHash(pdfJob.hash);
            return reply.code(400).send({
              message: 'No PDF produced'
            });
          }
  
          const bufferSize = Buffer.isBuffer(pdfBuffer)
            ? pdfBuffer.length
            : Buffer.byteLength(String(pdfBuffer));
  
          await TrafficLimiter.recordTraffic(bufferSize);
          await PdfJob.deleteByHash(pdfJob.hash);
          
          return reply
            .header('Content-Type', 'application/pdf')
            .send(pdfBuffer);
        } else {
          return reply.code(400).send({
            message: 'Could not render PDF due to unknown error'
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(400).send({
          message: `Rendering timeout or error: ${errorMessage}`
        });
      }
    } else {
      // Async mode - return job ID
      return reply.send({
        pdfid: pdfJob.hash
      });
    }
  });
}

function getFirstDayOfNextMonth(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString().split('T')[0];
}

/**
 * Handle status query (when pdfid is provided)
 */
async function handleStatusQuery(pdfid: string, reply: FastifyReply) {
  try {
    const pdfJob = await PdfJob.findByHash(pdfid);
    
    if (!pdfJob) {
      return reply.code(400).send({
        pdfid,
        status: 'error',
        message: 'pdfid invalid'
      });
    }

    switch (pdfJob.status) {
      case 'success':
        const pdfBuffer = pdfJob.pdf;
        await PdfJob.deleteByHash(pdfid);
        return reply
          .header('Content-Type', 'application/pdf')
          .send(pdfBuffer);

      case 'open':
        return reply.send({
          pdfid,
          status: 'open',
          message: 'PDF rendering has not started yet'
        });

      case 'in_progress':
        return reply.send({
          pdfid,
          status: 'in_progress',
          message: 'PDF rendering is currently in progress'
        });

      case 'error':
      default:
        await PdfJob.deleteByHash(pdfid);
        return reply.code(400).send({
          pdfid,
          status: 'error',
          message: pdfJob.status_message || 'Could not render PDF due to unknown error'
        });
    }
  } catch (error) {
    return reply.code(400).send({
      pdfid,
      status: 'error',
      message: 'pdfid invalid'
    });
  }
}

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('API server running on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

init()
  .then(() => start())
  .catch((err) => {
    fastify.log.error(err);
    process.exit(1);
  });