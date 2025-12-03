import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/app/lib/prisma';
import { convertDocxToHtmlWithLibreOffice } from '@/app/lib/convertDoc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 清理导入的 HTML，移除多余的换行和格式，保留图片尺寸
function cleanImportedHtml(html: string): string {
  if (!html) return '';
  
  let cleaned = html;
  
  // 1. 清理图片标签：保留 width/height 属性，移除其他不必要的属性
  cleaned = cleaned.replace(/<img\s+([^>]*?)>/gi, (match, attrs) => {
    // 提取有用的属性
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
    const widthMatch = attrs.match(/width=["'](\d+)["']/i);
    const heightMatch = attrs.match(/height=["'](\d+)["']/i);
    const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
    
    let newAttrs = '';
    if (srcMatch) {
      newAttrs += ` src="${srcMatch[1]}"`;
    }
    if (widthMatch) {
      newAttrs += ` width="${widthMatch[1]}"`;
    }
    if (heightMatch) {
      newAttrs += ` height="${heightMatch[1]}"`;
    }
    if (altMatch) {
      newAttrs += ` alt="${altMatch[1]}"`;
    }
    
    return `<img${newAttrs}>`;
  });
  
  // 2. 清理多余的空白和换行
  // 移除标签之间的多余空白
  cleaned = cleaned.replace(/>\s+</g, '><');
  
  // 3. 清理空的段落标签
  cleaned = cleaned.replace(/<p[^>]*>\s*<\/p>/gi, '');
  cleaned = cleaned.replace(/<div[^>]*>\s*<\/div>/gi, '');
  
  // 4. 清理多余的 <br> 标签（连续多个换行）
  cleaned = cleaned.replace(/(<br\s*\/?>){3,}/gi, '<br><br>');
  
  // 5. 清理段落标签，但保留内容
  // 如果段落只包含图片，移除 <p> 标签
  cleaned = cleaned.replace(/<p[^>]*>(<img[^>]+>)<\/p>/gi, '$1');
  
  // 6. 清理图片前后的多余换行和空白
  cleaned = cleaned.replace(/(<br\s*\/?>)*\s*(<img[^>]+>)\s*(<br\s*\/?>)*/gi, ' $2 ');
  
  // 7. 清理段落标签前后的空白
  cleaned = cleaned.replace(/\s*<p[^>]*>/gi, '<p>');
  cleaned = cleaned.replace(/<\/p>\s*/gi, '</p>');
  
  // 8. 清理图片标签前后的多余空白和换行
  // 图片前后不应该有换行，除非是段落分隔
  cleaned = cleaned.replace(/\s*(<img[^>]+>)\s*/g, ' $1 ');
  
  // 9. 清理段落内的多余空白
  cleaned = cleaned.replace(/<p[^>]*>\s+/g, '<p>');
  cleaned = cleaned.replace(/\s+<\/p>/g, '</p>');
  
  // 10. 合并多个连续空格为单个空格（但保留标签内的内容）
  // 使用更简单的方法：先标记标签，然后清理空白，再恢复标签
  const tagPlaceholders: string[] = [];
  let tagIndex = 0;
  
  // 替换所有标签为占位符
  cleaned = cleaned.replace(/<[^>]+>/g, (match) => {
    tagPlaceholders.push(match);
    return `__TAG_${tagIndex++}__`;
  });
  
  // 清理多余空白
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // 恢复标签
  cleaned = cleaned.replace(/__TAG_(\d+)__/g, (match, index) => {
    return tagPlaceholders[parseInt(index)] || match;
  });
  
  return cleaned.trim();
}

async function ensureUploadDir(): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const type = (formData.get('type') as string) ?? 'OTHER';
    const difficulty = (formData.get('difficulty') as string) ?? 'MEDIUM';
    const source = (formData.get('source') as string) || undefined;

    if (!file) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 });
    }

    // 在 Next.js API 路由中，formData.get('file') 返回 File 对象
    // 使用类型断言和安全的属性访问
    const fileObj = file as any;
    
    if (!fileObj || typeof fileObj.arrayBuffer !== 'function') {
      return NextResponse.json({ error: '无效的文件对象' }, { status: 400 });
    }

    const arrayBuffer = await fileObj.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileName = (fileObj.name || '').toLowerCase();

    const uploadDir = await ensureUploadDir();
    const originalName = fileName || `import-${Date.now()}`;
    const isDocx = originalName.endsWith('.docx');

    if (!isDocx) {
      return NextResponse.json({ error: '仅支持 .docx 文件' }, { status: 400 });
    }

    // 保存 DOCX 文件
    const docxName = `import-${Date.now()}.docx`;
    const workDocxPath = path.join(uploadDir, docxName);
    await fs.writeFile(workDocxPath, fileBuffer);

    // 优先使用 LibreOffice 转换（能处理公式、OLE 对象等）
    // 如果失败，回退到 mammoth
    let html = '';
    let useLibreOffice = true;

    try {
      // 创建临时目录用于 LibreOffice 转换
      const tempDir = path.join(process.cwd(), 'tmp', `convert-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      // 使用 LibreOffice 转换
      const { htmlPath, assetsDir } = await convertDocxToHtmlWithLibreOffice(workDocxPath, tempDir);
      
      // 读取 HTML 内容
      let htmlContent = await fs.readFile(htmlPath, 'utf-8');
      
      // 提取 body 内容，去掉 DOCTYPE、html、head 等标签
      // 只保留 body 内的内容，避免嵌套 HTML 结构
      const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch && bodyMatch[1]) {
        htmlContent = bodyMatch[1].trim();
        if (process.env.NODE_ENV === 'development') {
          console.log('已提取 body 内容，长度:', htmlContent.length);
        }
      } else {
        // 如果没有找到 body 标签，尝试移除 DOCTYPE 和 html 标签
        htmlContent = htmlContent
          .replace(/<!DOCTYPE[^>]*>/gi, '')
          .replace(/<html[^>]*>/gi, '')
          .replace(/<\/html>/gi, '')
          .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
          .trim();
        if (process.env.NODE_ENV === 'development') {
          console.log('未找到 body 标签，已移除 DOCTYPE/html/head，长度:', htmlContent.length);
        }
      }
      
      // 调试：输出 HTML 片段（开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log('处理后的 HTML 片段（前500字符）:', htmlContent.substring(0, 500));
        console.log('找到的 assetsDir:', assetsDir);
        // 查找 HTML 中的图片路径
        const imageMatches = htmlContent.match(/(src|href)=["']([^"']*\.(gif|png|jpg|jpeg|svg|bmp|wmf|emf))["']/gi);
        if (imageMatches) {
          console.log('HTML 中的图片路径示例:', imageMatches.slice(0, 5));
        }
      }
      
      // 处理媒体文件（图片、公式等）
      // 如果 assetsDir 未找到，尝试在 HTML 文件所在目录查找
      let actualAssetsDir = assetsDir;
      if (!actualAssetsDir) {
        // 尝试在 HTML 文件所在目录查找图片文件
        const htmlDir = path.dirname(htmlPath);
        const htmlDirFiles = await fs.readdir(htmlDir, { withFileTypes: true });
        const imageFiles = htmlDirFiles.filter(f => 
          f.isFile() && /\.(gif|png|jpg|jpeg|svg|bmp|wmf|emf)$/i.test(f.name)
        );
        if (imageFiles.length > 0) {
          actualAssetsDir = htmlDir;
          if (process.env.NODE_ENV === 'development') {
            console.log('未找到 assetsDir，使用 HTML 文件所在目录:', actualAssetsDir);
          }
        }
      }
      
      if (actualAssetsDir) {
        // 递归读取媒体目录中的所有文件
        const getAllFiles = async (dir: string, fileList: string[] = []): Promise<string[]> => {
          const files = await fs.readdir(dir, { withFileTypes: true });
          for (const file of files) {
            const filePath = path.join(dir, file.name);
            if (file.isDirectory()) {
              await getAllFiles(filePath, fileList);
            } else {
              fileList.push(filePath);
            }
          }
          return fileList;
        };
        
        const allFiles = await getAllFiles(actualAssetsDir);
        const dirName = path.basename(actualAssetsDir);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`找到媒体目录: ${assetsDir}, 文件数: ${allFiles.length}`);
        }
        
        // 创建文件名映射表
        const fileMap = new Map<string, string>();
        
        for (const sourcePath of allFiles) {
          const fileName = path.basename(sourcePath);
          const ext = path.extname(fileName);
          
          // 跳过非图片文件（可选，也可以都处理）
          if (!['.png', '.jpg', '.jpeg', '.gif', '.svg', '.bmp', '.wmf', '.emf'].includes(ext.toLowerCase())) {
            continue;
          }
          
          // 生成新的文件名
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).slice(2);
          const newName = `img-${timestamp}-${randomStr}${ext}`;
          const targetPath = path.join(uploadDir, newName);
          
          // 复制文件到 uploads 目录
          await fs.copyFile(sourcePath, targetPath);
          
          // 计算相对路径（用于在 HTML 中查找）
          const relativePath = path.relative(actualAssetsDir, sourcePath).replace(/\\/g, '/');
          const newPath = `/uploads/${newName}`;
          
          // 存储映射关系
          fileMap.set(fileName, newPath);
          if (relativePath !== fileName) {
            fileMap.set(relativePath, newPath);
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`复制图片: ${fileName} -> ${newName}, 相对路径: ${relativePath}`);
          }
        }
        
        // 批量替换 HTML 中的图片路径
        // 按文件名长度从长到短排序，避免短文件名匹配到长文件名的一部分
        const sortedFiles = Array.from(fileMap.keys()).sort((a, b) => b.length - a.length);
        
        for (const oldPath of sortedFiles) {
          const newPath = fileMap.get(oldPath)!;
          const escapedOldPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // 替换各种可能的路径格式
          // 格式1: src="oldPath" 或 src='oldPath'
          htmlContent = htmlContent.replace(
            new RegExp(`(src|href)=["']${escapedOldPath}["']`, 'gi'),
            (match, attr) => {
              return `${attr}="${newPath}"`;
            }
          );
          
          // 格式2: src="./oldPath" 或 src='./oldPath'
          htmlContent = htmlContent.replace(
            new RegExp(`(src|href)=["']\\./${escapedOldPath}["']`, 'gi'),
            (match, attr) => {
              return `${attr}="${newPath}"`;
            }
          );
          
          // 格式3: src="../oldPath" 或 src='../oldPath'
          htmlContent = htmlContent.replace(
            new RegExp(`(src|href)=["']\\.\\./${escapedOldPath}["']`, 'gi'),
            (match, attr) => {
              return `${attr}="${newPath}"`;
            }
          );
          
          // 格式4: 包含目录名的路径 dirName/oldPath
          if (dirName && oldPath.includes('/')) {
            const dirEscaped = dirName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            htmlContent = htmlContent.replace(
              new RegExp(`(src|href)=["']([^"']*${dirEscaped}[^"']*${escapedOldPath})["']`, 'gi'),
              (match, attr) => {
                return `${attr}="${newPath}"`;
              }
            );
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          // 检查是否还有未替换的图片路径
          const remainingImages = htmlContent.match(/(src|href)=["']([^"']*\.(gif|png|jpg|jpeg|svg|bmp|wmf|emf))["']/gi);
          if (remainingImages) {
            console.log('警告: 可能还有未替换的图片路径:', remainingImages.slice(0, 5));
          }
        }
      }
      
      // 最终清理：确保 HTML 内容不包含完整的文档结构
      // 如果还有 DOCTYPE 或 html 标签，再次清理
      if (htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html')) {
        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (bodyMatch && bodyMatch[1]) {
          htmlContent = bodyMatch[1].trim();
        } else {
          htmlContent = htmlContent
            .replace(/<!DOCTYPE[^>]*>/gi, '')
            .replace(/<html[^>]*>/gi, '')
            .replace(/<\/html>/gi, '')
            .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
            .trim();
        }
      }
      
      // 清理 HTML：移除多余的换行和格式
      htmlContent = cleanImportedHtml(htmlContent);
      
      html = htmlContent;
      
      // 清理临时目录
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('清理临时目录失败:', cleanupError);
      }
      
    } catch (libreOfficeError: any) {
      console.warn('LibreOffice 转换失败，回退到 mammoth:', libreOfficeError);
      useLibreOffice = false;
      
      // 回退到 mammoth
      try {
        const m = await mammoth.convertToHtml({ path: workDocxPath }, {
          convertImage: (mammoth as any).images.inline(async (element: any) => {
            const imageBuffer = Buffer.from(await element.read('base64'), 'base64');
            const name = `img-${Date.now()}-${Math.random().toString(36).slice(2)}.${element.contentType.split('/')[1] || 'png'}`;
            const fp = path.join(uploadDir, name);
            await fs.writeFile(fp, imageBuffer);
            return { src: `/uploads/${name}` };
          }),
        });
        html = m.value;
      } catch (mammothError: any) {
        throw new Error(`文档转换失败: LibreOffice(${libreOfficeError?.message}) 和 Mammoth(${mammothError?.message}) 都失败了`);
      }
    }

    const answerHtml = (formData.get('answerHtml') as string) || undefined;
    const tags = (formData.get('tags') as string) ? JSON.parse(formData.get('tags') as string) : undefined;

    const docxPathValue = workDocxPath.replace(process.cwd(), '').replace(/^\/|^\\/, '').startsWith('public/') 
      ? workDocxPath.slice(workDocxPath.indexOf('public') + 'public'.length).replace('\\', '/') 
      : `/uploads/${path.basename(workDocxPath)}`;

    const created = await prisma.question.create({
      data: {
        type: type as any,
        difficulty: difficulty as any,
        source,
        contentHtml: html,
        answerHtml,
        tags: tags as any,
        docxPath: docxPathValue,
      } as any, // 使用 as any 避免类型检查问题
    });

    return NextResponse.json({ id: created.id });
  } catch (err: any) {
    console.error('导入失败:', err);
    const errorMessage = err?.message || '导入失败';
    return NextResponse.json({ error: errorMessage, details: process.env.NODE_ENV === 'development' ? err?.stack : undefined }, { status: 500 });
  }
}


