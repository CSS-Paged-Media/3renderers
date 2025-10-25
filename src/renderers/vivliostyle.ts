import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

export async function renderVivliostyle(html: string): Promise<Buffer> {
  const id = randomUUID();
  const inputPath = join('/tmp', `${id}.html`);
  const outputPath = join('/tmp', `${id}.pdf`);

  try {
    await writeFile(inputPath, html);
    
    const { stderr } = await execAsync(
      `vivliostyle build ${inputPath} -o ${outputPath}`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
    
    if (stderr) {
      console.warn('Vivliostyle warnings:', stderr);
    }
    
    const pdf = await readFile(outputPath);
    return pdf;
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Vivliostyle rendering failed: ${msg}`);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}