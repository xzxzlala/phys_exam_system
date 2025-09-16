'use client';
import { useState } from 'react';

export default function AIPage() {
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState('OTHER');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [contentHtml, setContentHtml] = useState('');
  const [answerHtml, setAnswerHtml] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function generate() {
    setBusy(true); setMsg('');
    const res = await fetch('/api/ai/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, type, difficulty }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || '生成失败');
    else { setContentHtml(data.contentHtml || ''); setAnswerHtml(data.answerHtml || ''); }
    setBusy(false);
  }

  async function save() {
    setBusy(true); setMsg('');
    const res = await fetch('/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, difficulty, contentHtml, answerHtml, source: 'AI' }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || '保存失败');
    else setMsg(`保存成功，ID: ${data.id}`);
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">AI 生题</h1>
      <div className="grid gap-4">
        <textarea className="border rounded p-2 h-32" placeholder="输入原题或提示" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <div className="flex gap-4">
          <select className="border rounded p-2" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="SINGLE_CHOICE">单选</option>
            <option value="MULTIPLE_CHOICE">多选</option>
            <option value="TRUE_FALSE">判断</option>
            <option value="FILL_BLANK">填空</option>
            <option value="SHORT_ANSWER">简答</option>
            <option value="CALCULATION">计算题</option>
            <option value="OTHER">其他</option>
          </select>
          <select className="border rounded p-2" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="EASY">容易</option>
            <option value="MEDIUM">中等</option>
            <option value="HARD">困难</option>
          </select>
          <button disabled={busy} className="px-3 py-2 bg-black text-white rounded disabled:opacity-50" onClick={generate}>{busy ? '生成中...' : '生成'}</button>
          <button className="px-3 py-2 border rounded" onClick={save}>保存到题库</button>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">生成结果</h2>
        <div className="prose max-w-none border rounded p-3" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        {answerHtml && (
          <details className="mt-2">
            <summary className="cursor-pointer text-blue-600">查看解析</summary>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: answerHtml }} />
          </details>
        )}
      </div>
      {msg && <div className="text-sm text-gray-700">{msg}</div>}
    </main>
  );
}
