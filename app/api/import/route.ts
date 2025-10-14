import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/app/lib/prisma';
import { convertDocToDocx, convertDocxToHtmlWithLibreOffice } from '@/app/lib/convertDoc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadDir = await ensureUploadDir();
    const originalName = (file as File).name?.toLowerCase?.() || `import-${Date.now()}`;
    const isDoc = originalName.endsWith('.doc');
    const isDocx = originalName.endsWith('.docx');

    let workDocxPath: string;

    if (isDoc) {
      const docName = `import-${Date.now()}.doc`;
      const docPath = path.join(uploadDir, docName);
      await fs.writeFile(docPath, buffer);
      const converted = await convertDocToDocx(docPath, uploadDir);
      workDocxPath = converted;
    } else if (isDocx) {
      const docxName = `import-${Date.now()}.docx`;
      workDocxPath = path.join(uploadDir, docxName);
      await fs.writeFile(workDocxPath, buffer);
    } else {
      return NextResponse.json({ error: '仅支持 .doc 或 .docx 文件' }, { status: 400 });
    }

    // 优先尝试 LibreOffice HTML 导出，保真度更高
    let html = '';
    try {
      const tmpOutDir = path.join(uploadDir, `lo-${Date.now()}`);
      const { htmlPath, assetsDir } = await convertDocxToHtmlWithLibreOffice(workDocxPath, tmpOutDir);
      let raw = await fs.readFile(htmlPath, 'utf8');
      // 将导出的相对资源拷贝/移动到 public/uploads，并重写路径
      if (assetsDir) {
        const assetFiles = await fs.readdir(assetsDir);
        for (const f of assetFiles) {
          const from = path.join(assetsDir, f);
          const toName = `lo-${Date.now()}-${Math.random().toString(36).slice(2)}-${f}`;
          const to = path.join(uploadDir, toName);
          await fs.copyFile(from, to);
          raw = raw.replaceAll(new RegExp(`${f.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'g'), `/uploads/${toName}`);
        }
      }
      html = raw;
    } catch {
      // 回退到 mammoth（文本/表格较好，但形状可能丢）
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
    }

    const answerHtml = (formData.get('answerHtml') as string) || undefined;
    const tags = (formData.get('tags') as string) ? JSON.parse(formData.get('tags') as string) : undefined;

    const created = await prisma.question.create({
      data: {
        type: type as any,
        difficulty: difficulty as any,
        source,
        contentHtml: html,
        answerHtml,
        tags: tags as any,
        docxPath: workDocxPath.replace(process.cwd(), '').replace(/^\/|^\\/, '').startsWith('public/') ? workDocxPath.slice(workDocxPath.indexOf('public') + 'public'.length).replace('\\', '/') : `/uploads/${path.basename(workDocxPath)}`,
      },
    });

    return NextResponse.json({ id: created.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || '导入失败' }, { status: 500 });
  }
}


