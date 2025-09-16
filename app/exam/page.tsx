'use client';
import { useEffect, useState } from 'react';

type Question = { id: number; type: string; difficulty: string; contentHtml: string };

export default function ExamPage() {
  const [items, setItems] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [withAnswers, setWithAnswers] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/questions');
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => { load(); }, []);

  function toggle(id: number) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  async function exportExam(format: 'docx' | 'pdf') {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k));
    if (ids.length === 0) return;
    setBusy(true);
    const res = await fetch('/api/exam', { method: 'POST', body: JSON.stringify({ questionIds: ids, withAnswers }), headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    if (!res.ok) { alert(data.error || '创建失败'); setBusy(false); return; }
    const examId = data.id;
    const exportRes = await fetch('/api/export', { method: 'POST', body: JSON.stringify({ examId, format }), headers: { 'Content-Type': 'application/json' } });
    if (!exportRes.ok) { const ed = await exportRes.json(); alert(ed.error || '导出失败'); setBusy(false); return; }
    const blob = await exportRes.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `exam-${examId}.${format}`; a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">组卷</h1>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={withAnswers} onChange={(e) => setWithAnswers(e.target.checked)} />导出包含解析</label>
        <button disabled={busy} onClick={() => exportExam('docx')} className="px-3 py-2 border rounded disabled:opacity-50">导出 DOCX</button>
        <button disabled={busy} onClick={() => exportExam('pdf')} className="px-3 py-2 border rounded disabled:opacity-50">导出 PDF</button>
      </div>
      <ul className="space-y-4">
        {items.map((q) => (
          <li key={q.id} className="border rounded p-4">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={!!selected[q.id]} onChange={() => toggle(q.id)} />
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-2">#{q.id} · {q.type} · {q.difficulty}</div>
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: q.contentHtml }} />
              </div>
            </label>
          </li>
        ))}
      </ul>
    </main>
  );
}
