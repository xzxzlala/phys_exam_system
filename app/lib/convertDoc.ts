import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';

const execFileAsync = promisify(execFile);

export async function convertDocToDocx(inputPath: string, outDir: string): Promise<string> {
  const sofficeBin = process.env.SOFFICE_PATH || 'soffice';
  try {
    await execFileAsync(sofficeBin, ['--headless', '--convert-to', 'docx', '--outdir', outDir, inputPath], { env: process.env });
  } catch (e: any) {
    throw new Error(`无法执行 LibreOffice 转换：未找到 ${sofficeBin}。请安装 LibreOffice 或设置 SOFFICE_PATH。` + (e?.message ? ` 原因: ${e.message}` : ''));
  }
  const base = path.basename(inputPath, path.extname(inputPath));
  return path.join(outDir, `${base}.docx`);
}

// 使用 LibreOffice 将 docx 转为 HTML（尽量保留形状/文本框等为图片）
export async function convertDocxToHtmlWithLibreOffice(docxPath: string, outDir: string): Promise<{ htmlPath: string; assetsDir?: string }> {
  const sofficeBin = process.env.SOFFICE_PATH || 'soffice';
  await fs.mkdir(outDir, { recursive: true });
  try {
    // HTML 过滤器：直接使用默认 html 导出，能将绘图对象栅格化为图片
    await execFileAsync(sofficeBin, ['--headless', '--convert-to', 'html', '--outdir', outDir, docxPath], { env: process.env });
  } catch (e: any) {
    throw new Error(`LibreOffice HTML 导出失败，请确认 ${sofficeBin} 可用。` + (e?.message ? ` 原因: ${e.message}` : ''));
  }
  const base = path.basename(docxPath, path.extname(docxPath));
  // LibreOffice 会生成 base.html，资源通常在 base_html_* 目录
  const htmlPath = path.join(outDir, `${base}.html`);
  // 尝试查找同级的 *_html_* 目录
  const dirents = await fs.readdir(outDir, { withFileTypes: true });
  const assetsDir = dirents.find((d) => d.isDirectory() && d.name.startsWith(`${base}.`) || d.name.startsWith(`${base}_html`))?.name;
  return { htmlPath, assetsDir: assetsDir ? path.join(outDir, assetsDir) : undefined };
}
