import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import htmlToDocx from 'html-to-docx';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ensureUploadDir(): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

function replaceDataImages(html: string, uploadDir: string): { html: string; saved: string[] } {
  const saved: string[] = [];
  const replaced = html.replace(/src=["']data:([^;]+);base64,([^"']+)["']/g, (_m, contentType: string, b64: string) => {
    const ext = contentType.split('/')[1] || 'png';
    const name = `pasted-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buf = Buffer.from(b64, 'base64');
    const fp = path.join(uploadDir, name);
    saved.push(fp);
    fs.writeFile(fp, buf).catch(() => {});
    return `src="/uploads/${name}"`;
  });
  return { html: replaced, saved };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, difficulty, contentHtml, answerHtml, source } = body;
    if (!contentHtml || !type || !difficulty) return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });

    const uploadDir = await ensureUploadDir();
    const processed = replaceDataImages(contentHtml, uploadDir);

    const docxBuffer = await htmlToDocx(processed.html, undefined, { table: { row: { cantSplit: true } } });
    const docxName = `compose-${Date.now()}.docx`;
    const docxPath = path.join(uploadDir, docxName);
    await fs.writeFile(docxPath, Buffer.from(docxBuffer));

    const created = await prisma.question.create({
      data: {
        type,
        difficulty,
        source: source || undefined,
        contentHtml: processed.html,
        answerHtml: answerHtml || undefined,
        docxPath: `/uploads/${docxName}`,
      },
    });

    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '保存失败' }, { status: 500 });
  }
}
