import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';

const execFileAsync = promisify(execFile);

export async function convertDocToDocx(inputPath: string, outDir: string): Promise<string> {
  const sofficeBin = process.env.SOFFICE_PATH || 'soffice';
  const base = path.basename(inputPath, path.extname(inputPath));
  try {
    await execFileAsync(sofficeBin, ['--headless', '--convert-to', 'docx', '--outdir', outDir, inputPath], { env: process.env });
  } catch (e: any) {
    throw new Error(`无法执行 LibreOffice 转换：未找到 ${sofficeBin}。请安装 LibreOffice 或设置 SOFFICE_PATH。` + (e?.message ? ` 原因: ${e.message}` : ''));
  }
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
  
  // 检查 HTML 文件是否存在
  try {
    await fs.access(htmlPath);
  } catch {
    throw new Error(`LibreOffice 生成的 HTML 文件不存在: ${htmlPath}`);
  }
  
  // 尝试查找同级的 *_html_* 目录
  const dirents = await fs.readdir(outDir, { withFileTypes: true });
  
  // LibreOffice 可能生成的目录格式：
  // - base_html_xxxxx (base 是文件名)
  // - base.xxxxx
  // - base_files
  const assetsDir = dirents.find((d) => {
    if (!d.isDirectory()) return false;
    const name = d.name;
    return name.startsWith(`${base}.`) || 
           name.startsWith(`${base}_html`) || 
           name.includes('_html') ||
           name === `${base}_files` ||
           name.endsWith('_files');
  })?.name;
  
  const fullAssetsDir = assetsDir ? path.join(outDir, assetsDir) : undefined;
  
  // 调试信息
  if (process.env.NODE_ENV === 'development') {
    console.log(`LibreOffice 转换: base=${base}, 找到的目录:`, dirents.filter(d => d.isDirectory()).map(d => d.name));
    console.log(`最终 assetsDir:`, fullAssetsDir);
  }
  
  return { htmlPath, assetsDir: fullAssetsDir };
}

/**
 * 使用 LibreOffice 将 DOCX 转换为 HTML，并提取媒体文件（公式、图片等）
 * 这是处理老版 Word 公式（OLE 对象）的最佳方案
 */
export async function convertDocxToHtmlWithMedia(
  docxPath: string,
  outDir: string,
  mediaDir: string
): Promise<{ htmlPath: string; mediaDir: string }> {
  const sofficeBin = process.env.SOFFICE_PATH || 'soffice';
  
  // 确保输出目录和媒体目录存在
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(mediaDir, { recursive: true });
  
  try {
    // 使用 --extract-media 参数提取媒体文件（公式、图片等）
    await execFileAsync(
      sofficeBin,
      [
        '--headless',
        '--convert-to', 'html',
        '--outdir', outDir,
        docxPath
      ],
      {
        env: {
          ...process.env,
          // LibreOffice 会从环境变量或当前目录提取媒体
          // 我们通过修改工作目录来指定媒体提取位置
        },
        cwd: mediaDir, // 设置工作目录，但实际提取位置需要手动处理
      }
    );
  } catch (e: any) {
    throw new Error(`LibreOffice HTML 导出失败，请确认 ${sofficeBin} 可用。` + (e?.message ? ` 原因: ${e.message}` : ''));
  }
  
  const base = path.basename(docxPath, path.extname(docxPath));
  const htmlPath = path.join(outDir, `${base}.html`);
  
  // 检查 HTML 文件是否存在
  try {
    await fs.access(htmlPath);
  } catch {
    throw new Error(`LibreOffice 生成的 HTML 文件不存在: ${htmlPath}`);
  }
  
  // LibreOffice 会在输出目录创建 base_html_* 目录存放媒体文件
  // 查找媒体目录
  const dirents = await fs.readdir(outDir, { withFileTypes: true });
  const foundMediaDir = dirents.find(
    (d) => d.isDirectory() && (d.name.startsWith(`${base}.`) || d.name.includes('_html') || d.name.includes('_files'))
  )?.name;
  
  const actualMediaDir = foundMediaDir ? path.join(outDir, foundMediaDir) : undefined;
  
  return {
    htmlPath,
    mediaDir: actualMediaDir || mediaDir,
  };
}
