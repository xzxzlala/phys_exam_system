import { NextRequest } from 'next/server';
import { Document, Packer, Paragraph } from 'docx';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/app/lib/prisma';
import puppeteer from 'puppeteer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { examId, format } = body as { examId: number; format: 'docx' | 'pdf' };

  const exam = await prisma.exam.findUnique({
    where: { id: Number(examId) },
    include: { items: { include: { question: true }, orderBy: { order: 'asc' } } },
  });
  if (!exam) return new Response(JSON.stringify({ error: '试卷不存在' }), { status: 404 });

  const htmlParts = exam.items.map((it, idx) => `<div><div><b>${idx + 1}.</b></div>${it.question.contentHtml}${exam.withAnswers && it.question.answerHtml ? `<hr/><div>${it.question.answerHtml}</div>` : ''}</div>`);

  if (format === 'docx') {
    // 简单将 HTML 作为文本段落（MVP）；后续可用 html-to-docx 将 HTML 转为段落
    const doc = new Document({
      sections: [
        {
          children: htmlParts.map((h) => new Paragraph(h.replace(/<[^>]+>/g, ''))),
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="exam-${exam.id}.docx"`,
      },
    });
  }

  if (format === 'pdf') {
    const tmpDir = path.join(process.cwd(), '.tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const html = `<html><head><meta charset="utf-8"><style>img{max-width:100%;}</style></head><body>${htmlParts.join('<hr/>')}</body></html>`;
    const htmlPath = path.join(tmpDir, `exam-${exam.id}.html`);
    await fs.writeFile(htmlPath, html);
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="exam-${exam.id}.pdf"`,
      },
    });
  }

  return new Response(JSON.stringify({ error: '不支持的格式' }), { status: 400 });
}
