import { NextRequest } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ONLY = process.env.NEXT_PUBLIC_ONLYOFFICE_URL;
  if (!ONLY) return new Response('Missing NEXT_PUBLIC_ONLYOFFICE_URL', { status: 500 });
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('questionId') || '0');
  if (!id) return new Response('Missing questionId', { status: 400 });
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q || !q.docxPath) return new Response('Question or docx not found', { status: 404 });
  const fileUrl = new URL(q.docxPath, req.nextUrl.origin).toString();
  const redirectUrl = `${ONLY.replace(/\/$/, '')}/editor?fileUrl=${encodeURIComponent(fileUrl)}`;
  return Response.redirect(redirectUrl, 302);
}
