import { NextRequest } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/app/lib/prisma';
import puppeteer from 'puppeteer';
// @ts-ignore - html-to-docx 没有类型定义
import HTMLtoDOCX from 'html-to-docx';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } from 'docx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 处理 HTML 内容，转换为 docx 库的段落和图片
async function processHtmlForDocx(html: string, tempDir: string, baseUrl: string): Promise<any[]> {
  if (!html) return [];
  
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const elements: any[] = [];
  
  // 先按段落分割（保留 <p> 标签的结构）
  const paragraphMatches = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
  
  if (paragraphMatches && paragraphMatches.length > 0) {
    // 按段落处理
    for (const paraHtml of paragraphMatches) {
      const paraElements: any[] = [];
      
      // 提取段落中的图片和文本
      const imageMatches = paraHtml.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi);
      let lastIndex = paraHtml.indexOf('>') + 1; // 跳过 <p> 标签
      const paraEnd = paraHtml.lastIndexOf('</p>');
      
      if (imageMatches) {
        for (const imgTag of imageMatches) {
          const imgIndex = paraHtml.indexOf(imgTag, lastIndex);
          
          // 添加图片前的文本
          if (imgIndex > lastIndex) {
            const textBefore = paraHtml.substring(lastIndex, imgIndex)
              .replace(/<[^>]+>/g, '') // 移除所有标签，保留文本
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/\s+/g, ' ') // 合并多个空格
              .trim();
            if (textBefore) {
              paraElements.push(new TextRun({ text: textBefore }));
            }
          }
          
          // 处理图片
          const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
          const widthMatch = imgTag.match(/width=["'](\d+)["']/i);
          const heightMatch = imgTag.match(/height=["'](\d+)["']/i);
          
          if (srcMatch && srcMatch[1]) {
            const imageElement = await processImage(srcMatch[1], tempDir, baseUrl, widthMatch?.[1], heightMatch?.[1]);
            if (imageElement) {
              paraElements.push(imageElement);
            }
          }
          
          lastIndex = imgIndex + imgTag.length;
        }
      }
      
      // 添加最后一段文本
      if (lastIndex < paraEnd) {
        const textAfter = paraHtml.substring(lastIndex, paraEnd)
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ') // 合并多个空格
          .trim();
        if (textAfter) {
          paraElements.push(new TextRun({ text: textAfter }));
        }
      }
      
      // 如果没有找到图片，提取所有文本
      if (paraElements.length === 0) {
        const text = paraHtml
          .replace(/<p[^>]*>/gi, '')
          .replace(/<\/p>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ') // 合并多个空格
          .trim();
        if (text) {
          paraElements.push(new TextRun({ text: text }));
        }
      }
      
      // 创建段落（如果段落中有内容）
      // 如果段落中只有文本，且文本很短，可能不需要单独段落
      if (paraElements.length > 0) {
        // 检查是否应该合并到前一个段落
        const shouldMerge = paraElements.length === 1 && 
                           paraElements[0] instanceof TextRun && 
                           paraElements[0].text && 
                           paraElements[0].text.length < 50;
        
        if (shouldMerge && elements.length > 0 && elements[elements.length - 1] instanceof Paragraph) {
          // 合并到前一个段落
          const lastPara = elements[elements.length - 1] as any;
          if (lastPara.children && Array.isArray(lastPara.children)) {
            lastPara.children.push(...paraElements);
          }
        } else {
          elements.push(
            new Paragraph({
              children: paraElements,
              spacing: { after: 50 }, // 减少段落间距
            })
          );
        }
      }
    }
  } else {
    // 没有段落标签，按图片分割
    const imageMatches = html.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi);
    const parts: Array<{ type: 'text' | 'image'; content: string; width?: string; height?: string }> = [];
    let lastIndex = 0;
    
    if (imageMatches) {
      for (const imgTag of imageMatches) {
        const imgIndex = html.indexOf(imgTag, lastIndex);
        if (imgIndex > lastIndex) {
          const textBefore = html.substring(lastIndex, imgIndex)
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .trim();
          if (textBefore) {
            parts.push({ type: 'text', content: textBefore });
          }
        }
        
        const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
        const widthMatch = imgTag.match(/width=["'](\d+)["']/i);
        const heightMatch = imgTag.match(/height=["'](\d+)["']/i);
        if (srcMatch && srcMatch[1]) {
          parts.push({ 
            type: 'image', 
            content: srcMatch[1],
            width: widthMatch?.[1],
            height: heightMatch?.[1],
          });
        }
        
        lastIndex = imgIndex + imgTag.length;
      }
    }
    
    // 添加最后一段文本
    if (lastIndex < html.length) {
      const textAfter = html.substring(lastIndex)
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim();
      if (textAfter) {
        parts.push({ type: 'text', content: textAfter });
      }
    }
    
    // 如果没有找到图片，添加所有文本
    if (parts.length === 0) {
      const text = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      if (text) {
        parts.push({ type: 'text', content: text });
      }
    }
    
    // 转换为 docx 元素（文本和图片可以在同一段落）
    const paraChildren: any[] = [];
    for (const part of parts) {
        if (part.type === 'text') {
          if (part.content) {
            paraChildren.push(new TextRun({ text: part.content }));
          }
      } else if (part.type === 'image') {
        const imageElement = await processImage(part.content, tempDir, baseUrl, part.width, part.height);
        if (imageElement) {
          paraChildren.push(imageElement);
        }
      }
    }
    
    if (paraChildren.length > 0) {
      elements.push(
        new Paragraph({
          children: paraChildren,
          spacing: { after: 50 }, // 减少段落间距
        })
      );
    }
  }
  
  return elements.length > 0 ? elements : [new Paragraph({ text: ' ' })];
}

// 处理图片，返回 ImageRun 或 null
async function processImage(src: string, tempDir: string, baseUrl: string, htmlWidth?: string, htmlHeight?: string): Promise<any | null> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  
  let imagePath: string | null = null;
  
  // 如果是 base64，转换为文件
  if (src.startsWith('data:')) {
    try {
      const [mimeInfo, base64Data] = src.split(',');
      const mimeType = mimeInfo.match(/data:([^;]+)/)?.[1] || 'image/png';
      const ext = mimeType.split('/')[1] || 'png';
      const fileName = `img-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      imagePath = path.join(tempDir, fileName);
      
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.writeFile(imagePath, buffer);
    } catch (error: any) {
      console.error('base64 图片转换失败:', error);
      return null;
    }
  }
  // 如果是 /uploads/ 路径，复制到临时目录
  else if (src.startsWith('/uploads/') || src.startsWith('uploads/')) {
    try {
      const sourcePath = src.startsWith('/') 
        ? path.join(process.cwd(), 'public', src) 
        : path.join(process.cwd(), 'public', src);
      
      const fileExists = await fs.access(sourcePath).then(() => true).catch(() => false);
      if (fileExists) {
        const fileName = path.basename(sourcePath);
        imagePath = path.join(tempDir, fileName);
        await fs.copyFile(sourcePath, imagePath);
      }
    } catch (error: any) {
      console.error('图片复制失败:', error);
      return null;
    }
  }
  
  // 添加图片到文档
  if (imagePath) {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const ext = path.extname(imagePath).toLowerCase().slice(1);
      const imageType = ext === 'png' ? 'png' : ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext === 'gif' ? 'gif' : 'png';
      
      // 确定图片尺寸
      let width: number;
      let height: number;
      
      // 优先使用 HTML 中的 width/height 属性（如果存在）
      if (htmlWidth && htmlHeight) {
        width = parseInt(htmlWidth);
        height = parseInt(htmlHeight);
      } else {
        // 使用 sharp 获取图片实际尺寸
        try {
          const sharp = (await import('sharp')).default;
          const metadata = await sharp(imageBuffer).metadata();
          width = metadata.width || 200;
          height = metadata.height || 200;
        } catch (sharpError) {
          // sharp 失败，使用默认尺寸
          width = 200;
          height = 200;
        }
      }
      
      // 保持原始尺寸，不进行缩放
      // 但确保尺寸合理（最小 10px，最大 5000px）
      width = Math.max(10, Math.min(width, 5000));
      height = Math.max(10, Math.min(height, 5000));
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`添加图片到 DOCX: ${path.basename(imagePath)}, 尺寸: ${width}x${height}${htmlWidth ? ' (来自HTML)' : ''}`);
      }
      
      return new ImageRun({
        data: imageBuffer,
        transformation: {
          width: width,
          height: height,
        },
        type: imageType,
      } as any);
    } catch (error: any) {
      console.error('读取图片失败:', error);
      return null;
    }
  }
  
  return null;
}

// 清理 HTML，转换为 html-to-docx 支持的格式（保留用于 PDF 导出）
async function cleanHtmlForDocx(html: string, baseUrl: string, tempDir?: string): Promise<{ cleaned: string; imageFiles: string[] }> {
  if (!html) return { cleaned: '', imageFiles: [] };
  
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  
  let cleaned = html;
  const imageFiles: string[] = [];
  
  // 处理图片：将图片复制到临时目录，使用文件路径
  const imageMatches = cleaned.match(/<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi);
  if (imageMatches && tempDir) {
    for (const imgTag of imageMatches) {
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        const src = srcMatch[1];
        let newSrc = src;
        
        // 如果是 base64，转换为文件
        if (src.startsWith('data:')) {
          try {
            const [mimeInfo, base64Data] = src.split(',');
            const mimeType = mimeInfo.match(/data:([^;]+)/)?.[1] || 'image/png';
            const ext = mimeType.split('/')[1] || 'png';
            const fileName = `img-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const filePath = path.join(tempDir, fileName);
            
            const buffer = Buffer.from(base64Data, 'base64');
            await fs.writeFile(filePath, buffer);
            // 使用相对路径（相对于临时目录）
            newSrc = fileName;
            imageFiles.push(filePath);
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`base64 图片转换为文件: ${fileName}, 使用相对路径: ${newSrc}`);
            }
          } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`base64 转换失败:`, error?.message);
            }
            continue;
          }
        }
        // 如果是 /uploads/ 路径，复制到临时目录
        else if (src.startsWith('/uploads/') || src.startsWith('uploads/')) {
          try {
            const sourcePath = src.startsWith('/') 
              ? path.join(process.cwd(), 'public', src) 
              : path.join(process.cwd(), 'public', src);
            
            const fileExists = await fs.access(sourcePath).then(() => true).catch(() => false);
            if (fileExists) {
              const fileName = path.basename(sourcePath);
              const destPath = path.join(tempDir, fileName);
              await fs.copyFile(sourcePath, destPath);
              // 使用相对路径（相对于临时目录），html-to-docx 可能支持相对路径
              newSrc = fileName;
              imageFiles.push(destPath);
              
              if (process.env.NODE_ENV === 'development') {
                console.log(`图片复制到临时目录: ${fileName}, 使用相对路径: ${newSrc}`);
              }
            } else {
              // 文件不存在，使用绝对 URL
              newSrc = src.startsWith('/') ? `${baseUrl}${src}` : `${baseUrl}/${src}`;
            }
          } catch (error: any) {
            // 复制失败，使用绝对 URL
            newSrc = src.startsWith('/') ? `${baseUrl}${src}` : `${baseUrl}/${src}`;
            if (process.env.NODE_ENV === 'development') {
              console.log(`图片复制失败，使用绝对 URL: ${newSrc}`, error?.message);
            }
          }
        } else if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
          // 相对路径，转换为绝对路径
          newSrc = src.startsWith('/') ? `${baseUrl}${src}` : `${baseUrl}/${src}`;
        }
        
        // 替换图片 src（只替换第一个匹配的，避免重复替换）
        cleaned = cleaned.replace(imgTag, (match) => {
          return match.replace(src, newSrc);
        });
      }
    }
  } else if (imageMatches && !tempDir) {
    // 如果没有临时目录，使用绝对 URL
    for (const imgTag of imageMatches) {
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        const src = srcMatch[1];
        let newSrc = src;
        
        if (src.startsWith('/uploads/') || src.startsWith('uploads/')) {
          newSrc = src.startsWith('/') ? `${baseUrl}${src}` : `${baseUrl}/${src}`;
        } else if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
          newSrc = src.startsWith('/') ? `${baseUrl}${src}` : `${baseUrl}/${src}`;
        }
        
        cleaned = cleaned.replace(imgTag, (match) => {
          return match.replace(src, newSrc);
        });
      }
    }
  }
  
  // 清理不支持的 HTML 标签和属性
  // 移除 <font> 标签，保留内容
  cleaned = cleaned.replace(/<font[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/font>/gi, '');
  
  // 移除 <u> 标签，保留内容（或转换为样式）
  cleaned = cleaned.replace(/<u[^>]*>/gi, '<span style="text-decoration: underline;">');
  cleaned = cleaned.replace(/<\/u>/gi, '</span>');
  
  // 移除可能导致问题的属性
  cleaned = cleaned.replace(/\s+name=["'][^"']*["']/gi, ''); // 移除 name 属性
  cleaned = cleaned.replace(/\s+align=["'][^"']*["']/gi, ''); // 移除 align 属性（使用 style 代替）
  
  // 移除空标签
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
  cleaned = cleaned.replace(/<div>\s*<\/div>/gi, '');
  cleaned = cleaned.replace(/<span>\s*<\/span>/gi, '');
  
  // 清理多余的空白
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.trim();
  
  return { cleaned, imageFiles };
}

async function buildExamHtml(examId: number, baseUrl?: string, tempDir?: string): Promise<string> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { items: { include: { question: true }, orderBy: { order: 'asc' } } },
  });
  
  if (!exam) {
    throw new Error('试卷不存在');
  }

  const htmlParts = await Promise.all(exam.items.map(async (it, idx) => {
    let html = `<div style="margin-bottom: 20px;">`;
    html += `<div style="font-weight: bold; margin-bottom: 10px;">${idx + 1}. </div>`;
    
    // 清理题目 HTML
    const contentHtml = it.question.contentHtml || '';
    if (process.env.NODE_ENV === 'development' && idx === 0) {
      console.log(`题目 ${idx + 1} 的 HTML 长度:`, contentHtml.length);
      console.log(`题目 ${idx + 1} 的 HTML 前 200 字符:`, contentHtml.substring(0, 200));
    }
    
    const cleanedContent = baseUrl ? (await cleanHtmlForDocx(contentHtml, baseUrl, tempDir)).cleaned : contentHtml;
    html += `<div style="margin-bottom: 10px;">${cleanedContent}</div>`;
    
    if (exam.withAnswers && it.question.answerHtml) {
      html += `<hr style="margin: 15px 0;" />`;
      const cleanedAnswer = baseUrl ? (await cleanHtmlForDocx(it.question.answerHtml, baseUrl, tempDir)).cleaned : it.question.answerHtml;
      html += `<div style="margin-top: 10px;"><strong>解析：</strong>${cleanedAnswer}</div>`;
    }
    html += `</div>`;
    return html;
  }));
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`试卷包含 ${exam.items.length} 道题目`);
    console.log(`生成的 HTML 片段数: ${htmlParts.length}`);
  }

  // 只返回 body 内容，html-to-docx 会自动包装
  return `
    <h1 style="text-align: center; margin-bottom: 30px;">${exam.name || '考卷'}</h1>
    ${htmlParts.join('')}
  `;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { examId, format } = body as { examId: number; format: 'docx' | 'pdf' };

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: Number(examId) },
    });
    if (!exam) {
      return new Response(JSON.stringify({ error: '试卷不存在' }), { status: 404 });
    }

    if (format === 'docx') {
      // 使用 docx 库直接构建 DOCX，更好地控制图片嵌入
      const baseUrl = req.nextUrl.origin;
      
      // 创建临时目录用于存放图片
      const tempDir = path.join(process.cwd(), 'tmp', `export-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });
      
      try {
        const exam = await prisma.exam.findUnique({
          where: { id: Number(examId) },
          include: { items: { include: { question: true }, orderBy: { order: 'asc' } } },
        });
        
        if (!exam) {
          throw new Error('试卷不存在');
        }
        
        // 构建 DOCX 文档
        const children: any[] = [];
        
        // 标题
        children.push(
          new Paragraph({
            text: exam.name || '考卷',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          })
        );
        
        // 处理每道题目
        for (let idx = 0; idx < exam.items.length; idx++) {
          const it = exam.items[idx];
          const contentHtml = it.question.contentHtml || '';
          
          // 题号
          children.push(
            new Paragraph({
              text: `${idx + 1}. `,
              spacing: { before: 200, after: 200 },
            })
          );
          
          // 处理题目内容（包括图片）
          const processedContent = await processHtmlForDocx(contentHtml, tempDir, baseUrl);
          children.push(...processedContent);
          
          // 解析
          if (exam.withAnswers && it.question.answerHtml) {
            children.push(
              new Paragraph({
                text: '解析：',
                spacing: { before: 200, after: 200 },
              })
            );
            const processedAnswer = await processHtmlForDocx(it.question.answerHtml, tempDir, baseUrl);
            children.push(...processedAnswer);
          }
        }
        
        // 创建 DOCX 文档
        const doc = new Document({
          sections: [{
            children,
          }],
        });
        
        // 生成 DOCX buffer
        const docxBuffer = await Packer.toBuffer(doc);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('DOCX 文件生成成功，大小:', docxBuffer.length, 'bytes');
        }
        
        // 清理临时目录
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
          console.warn('清理临时目录失败:', cleanupError);
        }

        return new Response(docxBuffer as any, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="exam-${exam.id}.docx"`,
          },
        });
      } catch (docxError: any) {
        console.error('DOCX 转换失败:', docxError);
        throw new Error(`DOCX 转换失败: ${docxError?.message || '未知错误'}`);
      }
    }

    if (format === 'pdf') {
      // 使用 Puppeteer 将 HTML 转换为 PDF
      const baseUrl = req.nextUrl.origin;
      const bodyContent = await buildExamHtml(Number(examId), baseUrl);
      
      // PDF 需要完整的 HTML 文档
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: "Microsoft YaHei", "SimSun", serif; font-size: 12pt; line-height: 1.6; }
              img { max-width: 100%; height: auto; }
              p { margin: 8px 0; }
              h1, h2, h3 { margin: 12px 0 8px 0; }
              ul, ol { margin: 8px 0; padding-left: 30px; }
              table { border-collapse: collapse; width: 100%; margin: 10px 0; }
              table td, table th { border: 1px solid #ddd; padding: 8px; }
            </style>
          </head>
          <body>
            ${bodyContent}
          </body>
        </html>
      `;
      
      const browser = await puppeteer.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
      });
      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ 
        format: 'A4', 
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });
      await browser.close();
      
      return new Response(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="exam-${exam.id}.pdf"`,
        },
      });
    }

    return new Response(JSON.stringify({ error: '不支持的格式' }), { status: 400 });
  } catch (error: any) {
    console.error('导出失败:', error);
    const errorMessage = error?.message || '导出失败';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
