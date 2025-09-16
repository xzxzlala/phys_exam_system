'use client';
import { useState } from 'react';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('OTHER');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [answerHtml, setAnswerHtml] = useState('');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setMsg('请选择 DOC/DOCX 文件');
      return;
    }
    setBusy(true);
    setMsg('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    fd.append('difficulty', difficulty);
    if (answerHtml) fd.append('answerHtml', answerHtml);
    if (source) fd.append('source', source);

    const res = await fetch('/api/import', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) {
      setMsg(`导入失败：${data.error || res.statusText}`);
    } else {
      setMsg(`导入成功，ID: ${data.id}`);
      setFile(null);
      setAnswerHtml('');
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">导入题目</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">选择 DOC/DOCX 文件</label>
          <input type="file" accept=".doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">题型</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded p-2 w-full">
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
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="border rounded p-2 w-full">
              <option value="EASY">容易</option>
              <option value="MEDIUM">中等</option>
              <option value="HARD">困难</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">来源（可选）</label>
            <input value={source} onChange={(e) => setSource(e.target.value)} className="border rounded p-2 w-full" placeholder="例如：2024 期末卷" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">解析（支持 HTML，可留空）</label>
          <textarea value={answerHtml} onChange={(e) => setAnswerHtml(e.target.value)} className="border rounded p-2 w-full h-40" placeholder="可粘贴 HTML 或手写"></textarea>
        </div>
        <button disabled={busy} className="px-4 py-2 bg-black text-white rounded disabled:opacity-50">{busy ? '导入中...' : '导入'}</button>
      </form>
      {msg && <div className="text-sm text-gray-700">{msg}</div>}
    </main>
  );
}
