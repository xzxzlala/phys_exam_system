import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || undefined;
  const difficulty = searchParams.get('difficulty') || undefined;

  const where: any = {};
  if (type) where.type = type;
  if (difficulty) where.difficulty = difficulty;

  const items = await prisma.question.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, difficulty, contentHtml, answerHtml, source, tags } = body;
    if (!contentHtml || !type || !difficulty) return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    const created = await prisma.question.create({
      data: { type, difficulty, contentHtml, answerHtml: answerHtml || undefined, source: source || undefined, tags: tags || undefined },
    });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '保存失败' }, { status: 500 });
  }
}


