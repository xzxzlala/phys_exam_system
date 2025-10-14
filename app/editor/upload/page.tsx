'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function EditorUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('OTHER');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function go() {
    if (!file) { setMsg('请选择 DOC/DOCX 文件'); return; }
    setBusy(true); setMsg('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    fd.append('difficulty', difficulty);
    if (source) fd.append('source', source);
    const res = await fetch('/api/editor/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || '上传失败'); setBusy(false); return; }
    window.location.href = data.editorUrl;
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="text-sm"><Link href="/" className="text-blue-600 underline">返回首页</Link></div>
      <h1 className="text-2xl font-bold">在线编辑上传 DOC/DOCX</h1>
      <div className="space-y-4">
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
        <button disabled={busy} className="px-4 py-2 bg-black text-white rounded disabled:opacity-50" onClick={go}>{busy ? '处理中...' : '上传并在线编辑'}</button>
        {msg && <div className="text-sm text-gray-700">{msg}</div>}
      </div>
    </main>
  );
}
