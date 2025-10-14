'use client';
import { useEffect, useState } from 'react';

type Question = {
  id: number;
  type: string;
  difficulty: string;
  contentHtml: string;
  answerHtml?: string | null;
  createdAt: string;
  docxPath?: string | null;
};

export default function QuestionsPage() {
  const [items, setItems] = useState<Question[]>([]);
  const [type, setType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (type) qs.set('type', type);
    if (difficulty) qs.set('difficulty', difficulty);
    const res = await fetch(`/api/questions?${qs.toString()}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function isImageOnly(html: string): boolean {
    const trimmed = html.replace(/\s+/g, '');
    return /^<div>?<img[^>]+><\/div>$/.test(trimmed) || /^<img[^>]+>$/.test(trimmed);
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">题库</h1>
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">题型</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded p-2">
            <option value="">全部</option>
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
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="border rounded p-2">
            <option value="">全部</option>
            <option value="EASY">容易</option>
            <option value="MEDIUM">中等</option>
            <option value="HARD">困难</option>
          </select>
        </div>
        <button onClick={load} className="px-3 py-2 bg-black text-white rounded">刷新</button>
      </div>

      {loading ? (
        <div>加载中...</div>
      ) : (
        <ul className="space-y-6">
          {items.map((q) => {
            const onlyImg = !!q.docxPath ? false : isImageOnly(q.contentHtml || '');
            return (
              <li key={q.id} className="border rounded p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-2">#{q.id} · {q.type} · {q.difficulty}</div>
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: q.contentHtml }} />
                    {q.answerHtml && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600">查看解析</summary>
                        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: q.answerHtml }} />
                      </details>
                    )}
                  </div>
                  {q.docxPath && (
                    <a href={`/editor/doc/${q.id}`} className="px-3 py-2 border rounded whitespace-nowrap">在线编辑</a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
