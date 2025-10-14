import { NextRequest } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import path from 'node:path';
import fs from 'node:fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('questionId') || '0');
  if (!id) return new Response('Missing id', { status: 400 });
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q || !q.docxPath) return new Response('Not found', { status: 404 });
  const abs = path.join(process.cwd(), 'public', q.docxPath.replace(/^\//, ''));
  const data = await fs.readFile(abs);
  return new Response(data, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `inline; filename="question-${id}.docx"`,
    }
  });
}


