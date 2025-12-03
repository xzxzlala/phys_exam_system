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
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});

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

  async function handleDelete(id: number) {
    if (!confirm(`确定要删除题目 #${id} 吗？此操作无法撤销。`)) {
      return;
    }

    setDeleting((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || '删除失败');
        return;
      }

      // 从列表中移除
      setItems((prev) => prev.filter((q) => q.id !== id));
    } catch (error) {
      alert('删除失败，请重试');
    } finally {
      setDeleting((prev) => ({ ...prev, [id]: false }));
    }
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
                    <div 
                      className="prose max-w-none" 
                      dangerouslySetInnerHTML={{ __html: q.contentHtml }}
                      style={{
                        lineHeight: '1.6',
                      }}
                    />
                    {q.answerHtml && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600">查看解析</summary>
                        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: q.answerHtml }} />
                      </details>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <a 
                      href={`/questions/edit/${q.id}`} 
                      className="px-3 py-2 bg-blue-600 text-white rounded whitespace-nowrap hover:bg-blue-700"
                    >
                      编辑
                    </a>
                    <button
                      onClick={() => handleDelete(q.id)}
                      disabled={deleting[q.id]}
                      className="px-3 py-2 bg-red-600 text-white rounded whitespace-nowrap hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting[q.id] ? '删除中...' : '删除'}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
