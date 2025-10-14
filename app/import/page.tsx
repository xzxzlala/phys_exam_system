'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('OTHER');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [answerHtml, setAnswerHtml] = useState('');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgMsg, setImgMsg] = useState('');

  async function onSubmitDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setMsg('请选择 DOC 或 DOCX 文件'); return; }
    setBusy(true); setMsg('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    fd.append('difficulty', difficulty);
    if (answerHtml) fd.append('answerHtml', answerHtml);
    if (source) fd.append('source', source);
    const res = await fetch('/api/import', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) setMsg(`导入失败：${data.error || res.statusText}`);
    else { setMsg(`导入成功，ID: ${data.id}`); setFile(null); setAnswerHtml(''); }
    setBusy(false);
  }

  async function onUploadImage() {
    if (!imgFile) { setImgMsg('请选择图片'); return; }
    setImgBusy(true); setImgMsg('');
    const fd = new FormData();
    fd.append('file', imgFile);
    fd.append('type', type);
    fd.append('difficulty', difficulty);
    if (answerHtml) fd.append('answerHtml', answerHtml);
    if (source) fd.append('source', source);
    const res = await fetch('/api/import/image', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) setImgMsg(data.error || '上传失败');
    else setImgMsg(`创建成功，ID: ${data.id}`);
    setImgBusy(false);
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="text-sm"><Link href="/" className="text-blue-600 underline">返回首页</Link></div>
      <h1 className="text-2xl font-bold">导入题目（三种方式）</h1>

      <section className="space-y-4 border rounded p-4">
        <h2 className="text-lg font-semibold">方式一：上传图片作为题目</h2>
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
          <input type="file" accept="image/*" onChange={(e) => setImgFile(e.target.files?.[0] || null)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">解析（可选）</label>
          <textarea value={answerHtml} onChange={(e) => setAnswerHtml(e.target.value)} className="border rounded p-2 w-full h-32" placeholder="可粘贴 HTML 或手写"></textarea>
        </div>
        <button disabled={imgBusy} className="px-4 py-2 border rounded disabled:opacity-50" onClick={onUploadImage}>{imgBusy ? '上传中...' : '上传图片创建'}</button>
        {imgMsg && <div className="text-sm text-gray-700">{imgMsg}</div>}
      </section>

      <section className="space-y-3 border rounded p-4">
        <h2 className="text-lg font-semibold">方式二：在线编辑框粘贴 DOC/DOCX 内容</h2>
        <p className="text-sm text-gray-600">使用内置在线编辑页，将粘贴内容保存为题目并自动生成 DOCX，可继续用 Office 插件在线编辑。</p>
        <Link href="/compose" className="px-4 py-2 bg-black text-white rounded inline-block">打开在线编辑框</Link>
      </section>

      <section className="space-y-4 border rounded p-4">
        <h2 className="text-lg font-semibold">方式三：直接上传 DOC/DOCX 文件</h2>
        <form onSubmit={onSubmitDoc} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">选择 DOC/DOCX 文件</label>
            <input type="file" accept=".doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">解析（可选）</label>
            <textarea value={answerHtml} onChange={(e) => setAnswerHtml(e.target.value)} className="border rounded p-2 w-full h-32" placeholder="可粘贴 HTML 或手写"></textarea>
          </div>
          <button disabled={busy} className="px-4 py-2 bg-black text-white rounded disabled:opacity-50">{busy ? '导入中...' : '导入'}</button>
          {msg && <div className="text-sm text-gray-700">{msg}</div>}
        </form>
        <div className="text-sm">想上传后马上在线编辑？前往 <Link href="/editor/upload" className="text-blue-600 underline">在线编辑上传</Link></div>
      </section>
    </main>
  );
}
