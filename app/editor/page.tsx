'use client';
import { useEffect, useMemo, useState } from 'react';

const DS_URL = process.env.NEXT_PUBLIC_ONLYOFFICE_URL || '';

export default function EditorPage() {
  const [qid, setQid] = useState('');
  const url = useMemo(() => (qid ? `${location.origin}/api/editor/config?questionId=${qid}` : ''), [qid]);

  useEffect(() => {
    // no-op
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">Word 在线编辑</h1>
      {!DS_URL && (
        <div className="text-sm text-red-600">请设置环境变量 NEXT_PUBLIC_ONLYOFFICE_URL 指向 Document Server，如 http://localhost:8080</div>
      )}
      <div className="flex gap-2">
        <input className="border rounded p-2" placeholder="输入题目 ID" value={qid} onChange={(e) => setQid(e.target.value)} />
        <a className="px-3 py-2 border rounded" href={url} target="_blank">打开编辑</a>
      </div>
      <p className="text-gray-600 text-sm">说明：本页将重定向到配置端点生成的 OnlyOffice 编辑器页面。</p>
    </main>
  );
}
