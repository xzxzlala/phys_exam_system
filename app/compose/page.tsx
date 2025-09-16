'use client';
import { useState } from 'react';

export default function ComposePage() {
  const [type, setType] = useState('OTHER');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [source, setSource] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [answerHtml, setAnswerHtml] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true); setMsg('');
    const res = await fetch('/api/compose/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, difficulty, source, contentHtml, answerHtml }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || '保存失败');
    else setMsg(`保存成功，ID: ${data.id}`);
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">在线粘贴编辑</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">题型</label>
          <select className="border rounded p-2 w-full" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="SINGLE_CHOICE">单选</option>
            <option value="MULTIPLE_CHOICE">多选</option>
            <option value="TRUE_FALSE">判断</option>
            <option value="FILL_BLANK">填空</option>
            <option value="SHORT_ANSWER">简答</option>
            <option value="CALCULATION">计算题</option>
            <option value="OTHER">其他</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">难度</label>
          <select className="border rounded p-2 w-full" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="EASY">容易</option>
            <option value="MEDIUM">中等</option>
            <option value="HARD">困难</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">来源（可选）</label>
          <input className="border rounded p-2 w-full" value={source} onChange={(e) => setSource(e.target.value)} placeholder="如：自拟/教材/真题" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">题目内容（可从 Word 复制粘贴，支持图片）</label>
        <textarea className="border rounded p-2 w-full h-64" value={contentHtml} onChange={(e) => setContentHtml(e.target.value)} placeholder="可直接粘贴 HTML 或富文本的 HTML（可用富文本编辑器替换）"></textarea>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">解析（可选）</label>
        <textarea className="border rounded p-2 w-full h-40" value={answerHtml} onChange={(e) => setAnswerHtml(e.target.value)}></textarea>
      </div>
      <button disabled={busy} className="px-4 py-2 bg-black text-white rounded disabled:opacity-50" onClick={save}>{busy ? '保存中...' : '保存到题库'}</button>
      {msg && <div className="text-sm text-gray-700">{msg}</div>}
    </main>
  );
}
