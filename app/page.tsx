import Image from "next/image";
import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-3xl font-bold">物理题库系统（MVP）</h1>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Link href="/import" className="rounded border p-6 hover:bg-gray-50">
          <div className="text-xl font-semibold">导入题目</div>
          <div className="text-gray-600 mt-2 text-sm">支持 DOC/DOCX，保留排版与图片</div>
        </Link>
        <Link href="/questions" className="rounded border p-6 hover:bg-gray-50">
          <div className="text-xl font-semibold">题库</div>
          <div className="text-gray-600 mt-2 text-sm">按题型、难度筛选浏览</div>
        </Link>
        <Link href="/exam" className="rounded border p-6 hover:bg-gray-50">
          <div className="text-xl font-semibold">组卷</div>
          <div className="text-gray-600 mt-2 text-sm">选择题目并导出 DOCX/PDF</div>
        </Link>
        <Link href="/ai" className="rounded border p-6 hover:bg-gray-50">
          <div className="text-xl font-semibold">AI 生题</div>
          <div className="text-gray-600 mt-2 text-sm">根据提示生成相似题</div>
        </Link>
        <Link href="/compose" className="rounded border p-6 hover:bg-gray-50">
          <div className="text-xl font-semibold">在线粘贴编辑</div>
          <div className="text-gray-600 mt-2 text-sm">直接从 Word 粘贴逐题录入</div>
        </Link>
      </div>
    </main>
  );
}
