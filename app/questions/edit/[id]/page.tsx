'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RichTextEditor from '@/app/components/RichTextEditor';

type Question = {
  id: number;
  type: string;
  difficulty: string;
  source?: string | null;
  contentHtml: string;
  answerHtml?: string | null;
};

export default function EditQuestionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  
  const [type, setType] = useState('OTHER');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [source, setSource] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [answerHtml, setAnswerHtml] = useState('');

  useEffect(() => {
    if (!id) return;
    
    async function load() {
      try {
        const res = await fetch(`/api/questions/${id}`);
        if (!res.ok) {
          setMsg('题目不存在');
          return;
        }
        const data = await res.json();
        setQuestion(data);
        setType(data.type);
        setDifficulty(data.difficulty);
        setSource(data.source || '');
        setContentHtml(data.contentHtml || '');
        setAnswerHtml(data.answerHtml || '');
      } catch (error) {
        setMsg('加载失败');
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [id]);

  async function handleSave() {
    if (!id) return;
    
    setSaving(true);
    setMsg('');
    
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          difficulty,
          source: source || undefined,
          contentHtml,
          answerHtml: answerHtml || undefined,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setMsg(data.error || '保存失败');
      } else {
        setMsg('保存成功');
        setTimeout(() => {
          router.push('/questions');
        }, 1000);
      }
    } catch (error) {
      setMsg('保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div>加载中...</div>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="text-red-600">{msg || '题目不存在'}</div>
        <a href="/questions" className="text-blue-600 underline mt-4 inline-block">返回题库</a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">编辑题目 #{id}</h1>
        <a href="/questions" className="text-blue-600 underline">返回题库</a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">题型</label>
          <select 
            className="border rounded p-2 w-full" 
            value={type} 
            onChange={(e) => setType(e.target.value)}
          >
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
          <select 
            className="border rounded p-2 w-full" 
            value={difficulty} 
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="EASY">容易</option>
            <option value="MEDIUM">中等</option>
            <option value="HARD">困难</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">来源（可选）</label>
          <input 
            className="border rounded p-2 w-full" 
            value={source} 
            onChange={(e) => setSource(e.target.value)} 
            placeholder="如：自拟/教材/真题"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">题目内容</label>
        <RichTextEditor
          content={contentHtml}
          onChange={setContentHtml}
          placeholder="请输入题目内容..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">解析（可选）</label>
        <RichTextEditor
          content={answerHtml || ''}
          onChange={setAnswerHtml}
          placeholder="请输入解析..."
        />
      </div>

      <div className="flex gap-4">
        <button
          disabled={saving}
          onClick={handleSave}
          className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
        <button
          onClick={() => router.push('/questions')}
          className="px-4 py-2 border rounded"
        >
          取消
        </button>
      </div>

      {msg && (
        <div className={`text-sm ${msg.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
          {msg}
        </div>
      )}
    </main>
  );
}

