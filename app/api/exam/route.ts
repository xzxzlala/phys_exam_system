import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const questionIds: number[] = body.questionIds || [];
    const withAnswers: boolean = Boolean(body.withAnswers);
    const name: string = body.name || `试卷-${Date.now()}`;
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: '缺少题目 ID 列表' }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({ data: { name, withAnswers } });
      await tx.examQuestion.createMany({
        data: questionIds.map((id, idx) => ({ examId: exam.id, questionId: Number(id), order: idx + 1 })),
      });
      return exam;
    });

    return NextResponse.json({ id: created.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || '创建失败' }, { status: 500 });
  }
}
