import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
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
    const answerHtml = (form.get('answerHtml') as string) || undefined;

    if (!(file instanceof File)) return NextResponse.json({ error: '缺少图片' }, { status: 400 });

    const uploadDir = await ensureUploadDir();
    const name = `pic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = (file as File).type?.split('/')?.[1] || 'png';
    const fp = path.join(uploadDir, `${name}.${ext}`);
    const buf = Buffer.from(await (file as File).arrayBuffer());
    await fs.writeFile(fp, buf);

    const url = `/uploads/${name}.${ext}`;
    const contentHtml = `<div><img src="${url}" alt="题图"/></div>`;

    const created = await prisma.question.create({
      data: { type: type as any, difficulty: difficulty as any, source, contentHtml, answerHtml }
    });

    return NextResponse.json({ id: created.id, url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '上传失败' }, { status: 500 });
  }
}
