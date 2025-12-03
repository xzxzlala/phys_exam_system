'use client';
import { useEffect, useState } from 'react';

type Question = { id: number; type: string; difficulty: string; contentHtml: string };

export default function ExamPage() {
  const [items, setItems] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]); // 已选题目按顺序存储
  const [withAnswers, setWithAnswers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  async function load() {
    const res = await fetch('/api/questions');
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => { load(); }, []);

  function toggle(id: number) {
    setSelected((s) => {
      const newSelected = { ...s, [id]: !s[id] };
      // 更新顺序列表
      if (newSelected[id]) {
        // 添加到末尾（如果不存在）
        setSelectedOrder((order) => {
          if (order.includes(id)) {
            return order; // 已存在，不重复添加
          }
          return [...order, id];
        });
      } else {
        // 从顺序中移除
        setSelectedOrder((order) => order.filter((oid) => oid !== id));
      }
      return newSelected;
    });
  }

  // 拖拽开始
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  // 拖拽结束
  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  // 拖拽悬停
  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }

  // 拖拽离开
  function handleDragLeave() {
    setDragOverIndex(null);
  }

  // 拖拽放置
  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...selectedOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);
    setSelectedOrder(newOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  // 上移
  function moveUp(index: number, e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (index === 0) return;
    const newOrder = [...selectedOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setSelectedOrder(newOrder);
  }

  // 下移
  function moveDown(index: number, e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (index === selectedOrder.length - 1) return;
    const newOrder = [...selectedOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setSelectedOrder(newOrder);
  }

  // 移除题目
  function removeQuestion(id: number, e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    toggle(id);
  }

  // 获取已选题目（按顺序，去重）
  const uniqueOrder = selectedOrder.filter((id, index, arr) => arr.indexOf(id) === index);
  const selectedQuestions = uniqueOrder
    .map((id) => items.find((q) => q.id === id))
    .filter((q): q is Question => q !== undefined);

  // 同步 selectedOrder，移除重复项和无效项（仅在 items 变化时）
  useEffect(() => {
    if (items.length === 0) return;
    const validIds = selectedOrder.filter((id, index, arr) => 
      arr.indexOf(id) === index && items.some((q) => q.id === id)
    );
    if (validIds.length !== selectedOrder.length) {
      setSelectedOrder(validIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  async function exportExam(format: 'docx' | 'pdf') {
    if (selectedOrder.length === 0) {
      alert('请至少选择一道题目');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/exam', { 
      method: 'POST', 
      body: JSON.stringify({ questionIds: selectedOrder, withAnswers }), 
      headers: { 'Content-Type': 'application/json' } 
    });
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
      
      {/* 已选题目列表（可排序） */}
      {selectedQuestions.length > 0 && (
        <section className="border rounded p-4 bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">已选题目 ({selectedQuestions.length}) - 可拖拽调整顺序</h2>
          <div className="space-y-2">
            {selectedQuestions.map((q, index) => (
              <div key={`${q.id}-${index}`}>
                {dragOverIndex === index && draggedIndex !== null && draggedIndex !== index && (
                  <div className="h-1 bg-blue-500 rounded mb-2 transition-all" />
                )}
                <div
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`border rounded p-3 bg-white cursor-move flex items-center gap-3 transition-all ${
                    draggedIndex === index 
                      ? 'opacity-50 scale-95' 
                      : dragOverIndex === index 
                      ? 'border-blue-500 border-2' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                <div className="text-gray-400 text-sm select-none">☰</div>
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-1">
                    第 {index + 1} 题 · #{q.id} · {q.type} · {q.difficulty}
                  </div>
                  <div className="prose prose-sm max-w-none line-clamp-2" dangerouslySetInnerHTML={{ __html: q.contentHtml }} />
                </div>
                <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => moveUp(index, e)}
                    disabled={index === 0}
                    className="px-2 py-1 text-xs border rounded disabled:opacity-30 hover:bg-gray-100"
                    title="上移"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={(e) => moveDown(index, e)}
                    disabled={index === selectedQuestions.length - 1}
                    className="px-2 py-1 text-xs border rounded disabled:opacity-30 hover:bg-gray-100"
                    title="下移"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={(e) => removeQuestion(q.id, e)}
                    className="px-2 py-1 text-xs border rounded text-red-600 hover:bg-red-50"
                    title="移除"
                  >
                    ×
                  </button>
                </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={withAnswers} onChange={(e) => setWithAnswers(e.target.checked)} />导出包含解析
        </label>
        <button 
          disabled={busy || selectedQuestions.length === 0} 
          onClick={() => exportExam('docx')} 
          className="px-3 py-2 bg-black text-white rounded disabled:opacity-50"
        >
          {busy ? '导出中...' : '导出 DOCX'}
        </button>
        <button 
          disabled={busy || selectedQuestions.length === 0} 
          onClick={() => exportExam('pdf')} 
          className="px-3 py-2 bg-black text-white rounded disabled:opacity-50"
        >
          {busy ? '导出中...' : '导出 PDF'}
        </button>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">题库 - 选择题目</h2>
        <ul className="space-y-4">
          {items.map((q) => (
            <li key={q.id} className="border rounded p-4">
              <label className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  checked={!!selected[q.id]} 
                  onChange={() => toggle(q.id)} 
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-2">#{q.id} · {q.type} · {q.difficulty}</div>
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: q.contentHtml }} />
                </div>
              </label>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
