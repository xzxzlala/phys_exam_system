import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

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

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '缺少图片文件' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '仅支持图片文件' }, { status: 400 });
    }

    const uploadDir = await ensureUploadDir();
    const name = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = file.type.split('/')[1] || 'png';
    const fp = path.join(uploadDir, `${name}.${ext}`);
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(fp, buf);

    const url = `/uploads/${name}.${ext}`;

    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '上传失败' }, { status: 500 });
  }
}

