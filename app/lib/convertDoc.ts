import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export async function convertDocToDocx(inputPath: string, outDir: string): Promise<string> {
  // Uses LibreOffice (soffice) headless conversion
  try {
    await execFileAsync('soffice', ['--headless', '--convert-to', 'docx', '--outdir', outDir, inputPath], { env: process.env });
  } catch (e: any) {
    throw new Error('无法执行 LibreOffice 转换，请确保已安装 soffice。' + (e?.message ? ` 原因: ${e.message}` : ''));
  }
  const base = path.basename(inputPath, path.extname(inputPath));
  return path.join(outDir, `${base}.docx`);
}
