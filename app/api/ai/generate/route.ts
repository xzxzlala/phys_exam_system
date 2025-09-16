import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('缺少 OPENAI_API_KEY');
  return new OpenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, type = 'OTHER', difficulty = 'MEDIUM' } = body as { prompt: string; type?: string; difficulty?: string };
    if (!prompt) return NextResponse.json({ error: '缺少 prompt' }, { status: 400 });

    const client = getClient();
    const sys = '你是一名高中物理命题老师，请根据输入题干生成一题相似但不重复的物理题，输出 HTML 格式的题干与解析。';
    const user = `题型: ${type}\n难度: ${difficulty}\n原题: ${prompt}\n请输出 JSON: {"contentHtml":"...","answerHtml":"..."}`;

    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      temperature: 0.7,
    });
    const text = resp.choices[0]?.message?.content || '{}';
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { contentHtml: text, answerHtml: '' }; }
    return NextResponse.json({ contentHtml: data.contentHtml || '', answerHtml: data.answerHtml || '' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || '生成失败' }, { status: 500 });
  }
}
