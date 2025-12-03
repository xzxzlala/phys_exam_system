import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: 获取单个题目
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的题目ID' }, { status: 400 });
    }

    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      return NextResponse.json({ error: '题目不存在' }, { status: 404 });
    }

    return NextResponse.json(question);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || '获取题目失败' },
      { status: 500 }
    );
  }
}

// PUT: 更新题目
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的题目ID' }, { status: 400 });
    }

    const body = await req.json();
    const { type, difficulty, source, contentHtml, answerHtml } = body;

    if (!contentHtml) {
      return NextResponse.json({ error: '题目内容不能为空' }, { status: 400 });
    }

    const question = await prisma.question.update({
      where: { id },
      data: {
        type: type as any,
        difficulty: difficulty as any,
        source: source || null,
        contentHtml,
        answerHtml: answerHtml || null,
      },
    });

    return NextResponse.json(question);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || '更新题目失败' },
      { status: 500 }
    );
  }
}

// DELETE: 删除题目
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的题目ID' }, { status: 400 });
    }

    // 直接删除题目，关联的 ExamQuestion 会自动删除（Cascade）
    await prisma.question.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    // 处理外键约束错误
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: '无法删除：该题目正在被使用' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error?.message || '删除失败' },
      { status: 500 }
    );
  }
}

