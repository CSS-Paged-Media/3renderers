import AdmZip from 'adm-zip';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { ALLOWED_FILE_TYPES, ALLOWED_MIME_TYPES } from '../types';
import { SecurityService } from './security';

export class AssetHandler {
  private assetDir: string;

  constructor() {
    this.assetDir = path.join('/tmp', 'assets');
  }

  /**
   * Extract and validate assets from base64 zip
   * Returns path mapping: filename -> absolute path
   */
  async extractAssets(base64Zip: string, jobId: string): Promise<Map<string, string>> {
    const assetMap = new Map<string, string>();
    const jobAssetDir = path.join(this.assetDir, jobId);

    try {
      // Decode base64
      const zipBuffer = Buffer.from(base64Zip, 'base64');
      
      // Create job-specific directory
      await fs.mkdir(jobAssetDir, { recursive: true });

      // Extract zip
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();

      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;

        const fileName = entry.entryName;
        const fileExtension = path.extname(fileName).slice(1).toLowerCase();
        
        // Check file extension
        if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
          console.log(`Skipping file with disallowed extension: ${fileName}`);
          continue;
        }

        // Extract file
        const fileData = entry.getData();
        const filePath = path.join(jobAssetDir, fileName);
        
        // Create subdirectories if needed
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, fileData);

        // Validate MIME type
        const fileType = await fileTypeFromBuffer(fileData);
        if (fileType && !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
          console.log(`Skipping file with disallowed MIME type: ${fileName} (${fileType.mime})`);
          await fs.unlink(filePath);
          continue;
        }

        // Clean JS/CSS files from malicious content
        if (fileExtension === 'js' || fileExtension === 'css') {
          const content = await fs.readFile(filePath, 'utf-8');
          const cleaned = SecurityService.clearStringFromFTPandFileLinks(content);
          await fs.writeFile(filePath, cleaned);
        }

        // Store mapping
        assetMap.set(fileName, filePath);
      }

      return assetMap;
    } catch (error: any) {
      // Cleanup on error
      await this.cleanup(jobId);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to extract assets: ${msg}`);
    }
  }

  /**
   * Replace asset references in HTML with absolute paths
   */
  replaceAssetPaths(html: string, assetMap: Map<string, string>): string {
    let processedHtml = html;
    
    for (const [fileName, absolutePath] of assetMap) {
      // Replace all occurrences of the filename with absolute path
      const regex = new RegExp(fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      processedHtml = processedHtml.replace(regex, absolutePath);
    }
    
    return processedHtml;
  }

  /**
   * Cleanup asset directory for a job
   */
  async cleanup(jobId: string): Promise<void> {
    const jobAssetDir = path.join(this.assetDir, jobId);
    try {
      await fs.rm(jobAssetDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to cleanup assets for job ${jobId}:`, error);
    }
  }
}