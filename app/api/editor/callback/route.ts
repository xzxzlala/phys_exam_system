import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import path from 'node:path';
import fs from 'node:fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('questionId') || '0');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const q = await prisma.question.findUnique({ where: { id } });
    if (!q || !q.docxPath) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // 解析 OnlyOffice callback
    const body = await req.json();
    // status = 2 表示文档已保存，status = 6 表示强制保存
    if (body.status === 2 || body.status === 6) {
      const downloadUrl = body.url as string;
      const res = await fetch(downloadUrl);
      const buf = Buffer.from(await res.arrayBuffer());
      const abs = path.join(process.cwd(), 'public', q.docxPath.replace(/^\//, ''));
      await fs.writeFile(abs, buf);
    }
    return NextResponse.json({ result: 'ok' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'callback failed' }, { status: 500 });
  }
}


