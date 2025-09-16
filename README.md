This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 本地运行

1. 安装 Node.js 20（已在脚本中用 nvm 安装）。
2. 进入项目并安装依赖：

```bash
cd web
npm install
```

3. 初始化数据库（如未自动完成）：

```bash
npm exec prisma migrate dev
```

4. 启动开发：

```bash
npm run dev
```

访问 http://localhost:3000

## 功能
- 导入：上传 DOCX，保留排版图片（图片会保存到 `public/uploads`）
- 题库：按题型、难度筛选
- 组卷：预留导出入口（后端已提供 `/api/export` 接口）

## 导入 API
- 路径：`POST /api/import`
- form-data 字段：
  - `file`: DOCX 文件
  - `type`: 题型（SINGLE_CHOICE 等）
  - `difficulty`: 难度（EASY/MEDIUM/HARD）
  - `answerHtml`（可选）
  - `source`（可选）

## 查询 API
- 路径：`GET /api/questions?type=&difficulty=`

## 导出 API
- 路径：`POST /api/export`
- JSON：`{ "examId": 1, "format": "docx" | "pdf" }`
