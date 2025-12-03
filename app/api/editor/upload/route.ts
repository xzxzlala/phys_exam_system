import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ensureUploadDir(): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const type = (form.get('type') as string) || 'OTHER';
    const difficulty = (form.get('difficulty') as string) || 'MEDIUM';
    const source = (form.get('source') as string) || undefined;

    const fileObj = file as any;
    if (!fileObj || typeof fileObj.arrayBuffer !== 'function') {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 });
    }

    const uploadDir = await ensureUploadDir();
    const name = (fileObj.name || '').toLowerCase() || `upload-${Date.now()}`;
    const buf = Buffer.from(await fileObj.arrayBuffer());

    if (!name.endsWith('.docx')) {
      return NextResponse.json({ error: '仅支持 .docx 文件' }, { status: 400 });
    }

    const docxPath = path.join(uploadDir, `upload-${Date.now()}.docx`);
    await fs.writeFile(docxPath, buf);

    const { value: html } = await mammoth.convertToHtml({ path: docxPath }, {
      // mammoth 类型定义缺少 images.inline，这里以 any 断言
      convertImage: (mammoth as any).images.inline(async (element: any) => {
        const b = Buffer.from(await element.read('base64'), 'base64');
        const imgName = `img-${Date.now()}-${Math.random().toString(36).slice(2)}.${element.contentType.split('/')[1] || 'png'}`;
        const fp = path.join(uploadDir, imgName);
        await fs.writeFile(fp, b);
        return { src: `/uploads/${imgName}` };
      })
    });

    const created = await prisma.question.create({
      data: {
        type: type as any,
        difficulty: difficulty as any,
        source,
        contentHtml: html,
        docxPath: `/uploads/${path.basename(docxPath)}`,
      }
    });

    const editorUrl = new URL('/api/editor/config', req.nextUrl.origin);
    editorUrl.searchParams.set('questionId', String(created.id));

    return NextResponse.json({ id: created.id, editorUrl: editorUrl.toString() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '上传失败' }, { status: 500 });
  }
}
