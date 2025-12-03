import Image from "next/image";
import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-3xl font-bold">物理题库系统</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/import" className="rounded-lg border-2 p-8 hover:bg-gray-50 hover:border-blue-500 transition-colors">
          <div className="text-2xl font-semibold mb-2">导入题目</div>
          <div className="text-gray-600 text-sm">支持 DOCX 文件导入，自动处理公式和图片</div>
        </Link>
        <Link href="/questions" className="rounded-lg border-2 p-8 hover:bg-gray-50 hover:border-blue-500 transition-colors">
          <div className="text-2xl font-semibold mb-2">题库</div>
          <div className="text-gray-600 text-sm">浏览、编辑、删除题目，按题型和难度筛选</div>
        </Link>
        <Link href="/exam" className="rounded-lg border-2 p-8 hover:bg-gray-50 hover:border-blue-500 transition-colors">
          <div className="text-2xl font-semibold mb-2">组卷</div>
          <div className="text-gray-600 text-sm">选择题目并导出 DOCX/PDF 试卷</div>
        </Link>
      </div>
    </main>
  );
}
