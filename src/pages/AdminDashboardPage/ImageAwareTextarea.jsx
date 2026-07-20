import React, { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { uploadImage } from './api';

export default function ImageAwareTextarea({ value, onChange, placeholder, className = '', rows = 4, required = false }) {
  const textareaRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const handleUpload = async (file) => {
    setIsUploading(true);
    setUploadProgress(null);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setUploadProgress(60);
      const imageUrl = await uploadImage(base64);
      setUploadProgress(100);
      const markdown = `![${file.name || 'image'}](${imageUrl})`;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + markdown + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          textarea.focus();
          const pos = start + markdown.length;
          textarea.setSelectionRange(pos, pos);
        }, 0);
      }
    } catch (error) {
      console.error('Upload error:', error);
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const newValue = value.substring(0, start) + '❌ Ошибка загрузки изображения' + value.substring(textarea.selectionEnd);
        onChange(newValue);
      }
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(null), 500);
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) { await handleUpload(file); }
        break;
      }
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await handleUpload(file);
    }
    e.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await handleUpload(file);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        placeholder={placeholder}
        className={className}
        rows={rows}
        required={required}
      />
      <div className="absolute bottom-2 right-2 flex gap-1">
        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 rounded-lg p-1.5 transition-colors">
          <Upload size={14} className="text-slate-500" />
          <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        </label>
      </div>
      {isUploading && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-md animate-pulse flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" />
          {uploadProgress ? `${uploadProgress}%` : 'Загрузка...'}
        </div>
      )}
    </div>
  );
}
