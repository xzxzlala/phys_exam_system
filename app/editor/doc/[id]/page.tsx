'use client';
import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

declare global {
  // OnlyOffice Docs API typings placeholder
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { DocsAPI: any }
}

export default function OnlyOfficeDocEditorPage() {
  const params = useParams();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scriptUrl = `${process.env.NEXT_PUBLIC_ONLYOFFICE_URL?.replace(/\/$/, '')}/web-apps/apps/api/documents/api.js`;
    const s = document.createElement('script');
    s.src = scriptUrl;
    s.onload = () => init();
    document.body.appendChild(s);
    return () => {
      document.body.removeChild(s);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function init() {
    const qid = params?.id as string;
    if (!qid) return;
    const origin = window.location.origin;
    const fileUrl = `${origin}/api/editor/file?questionId=${qid}`; // 以受控方式提供文件下载
    const callbackUrl = `${origin}/api/editor/callback?questionId=${qid}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
      documentType: 'word',
      document: {
        fileType: 'docx',
        title: `question-${qid}.docx`,
        url: fileUrl,
      },
      editorConfig: {
        mode: 'edit',
        callbackUrl,
      },
      width: '100%',
      height: '100%'
    };

    // eslint-disable-next-line new-cap
    // @ts-ignore
    const editor = new window.DocsAPI.DocEditor(containerRef.current!, config);
    // 记录引用以便将来需要销毁
    // @ts-ignore
    (window as any).__ooEditor = editor;
  }

  return (
    <main className="w-screen h-[calc(100vh-0px)]">
      <div className="p-3 text-sm"><a href="/" className="text-blue-600 underline">返回首页</a></div>
      <div ref={containerRef} id="onlyoffice" className="w-full h-[calc(100vh-48px)]" />
    </main>
  );
}


