import { spawn } from 'child_process';

export async function renderWeasyPrint(html: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const process = spawn('python3', ['-m', 'weasyprint', '-', '-']);
    
    let pdfBuffer = Buffer.alloc(0);
    let errorOutput = '';

    process.stdout.on('data', (data: Buffer) => {
      pdfBuffer = Buffer.concat([pdfBuffer, data]);
    });

    process.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0 || pdfBuffer.length === 0) {
        reject(new Error(`WeasyPrint failed (exit code ${code}): ${errorOutput}`));
      } else {
        resolve(pdfBuffer);
      }
    });

    process.on('error', (err) => {
      reject(new Error(`WeasyPrint process error: ${err.message}`));
    });

    process.stdin.write(html);
    process.stdin.end();
  });
}