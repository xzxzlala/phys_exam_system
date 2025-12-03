'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = '请输入内容...',
  editable = true 
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[200px] p-4',
        style: 'font-size: 14px; line-height: 1.6;',
      },
    },
  });

  const handleImageUpload = async (file: File) => {
    if (!editor) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/editor/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('图片上传失败');
      }

      const data = await response.json();
      const imageUrl = data.url;

      // 插入图片到编辑器
      editor.chain().focus().setImage({ src: imageUrl }).run();
    } catch (error) {
      console.error('上传图片失败:', error);
      alert('图片上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
    // 重置input，允许重复选择同一文件
    e.target.value = '';
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {editable && (
        <div className="border-b bg-gray-50 p-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`px-3 py-1 text-sm border rounded ${
              editor.isActive('bold') ? 'bg-gray-200' : ''
            }`}
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`px-3 py-1 text-sm border rounded ${
              editor.isActive('italic') ? 'bg-gray-200' : ''
            }`}
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-3 py-1 text-sm border rounded ${
              editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''
            }`}
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-3 py-1 text-sm border rounded ${
              editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''
            }`}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-3 py-1 text-sm border rounded ${
              editor.isActive('bulletList') ? 'bg-gray-200' : ''
            }`}
          >
            列表
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-3 py-1 text-sm border rounded ${
              editor.isActive('orderedList') ? 'bg-gray-200' : ''
            }`}
          >
            有序列表
          </button>
          <div className="relative inline-block">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <button
              type="button"
              disabled={uploading}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              {uploading ? '上传中...' : '插入图片'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              const url = window.prompt('请输入链接地址:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            className={`px-3 py-1 text-sm border rounded ${
              editor.isActive('link') ? 'bg-gray-200' : ''
            }`}
          >
            链接
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

