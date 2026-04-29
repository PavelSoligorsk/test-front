// src/components/Admin/ImageAwareTextarea.jsx
import React, { useRef } from 'react';
import { useImageUpload } from '../../hooks/useImageUpload';

export const ImageAwareTextarea = ({
  value,
  onChange,
  placeholder,
  className = '',
  rows = 4,
  required = false,
}) => {
  const textareaRef = useRef(null);
  const { uploadImage, isUploading } = useImageUpload();

  const insertAtCursor = (text) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + text.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (!file) continue;
        
        const tempText = '⏳ Загрузка изображения...';
        insertAtCursor(tempText);
        
        const imageUrl = await uploadImage(file);
        
        if (imageUrl) {
          const newValue = value.replace(tempText, imageUrl);
          onChange(newValue);
        } else {
          const newValue = value.replace(tempText, '❌ Ошибка загрузки изображения');
          onChange(newValue);
        }
        break;
      }
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const imageUrl = await uploadImage(file);
        if (imageUrl) {
          insertAtCursor(imageUrl);
        }
      }
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
      {isUploading && (
        <div className="absolute bottom-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-md animate-pulse flex items-center gap-1">
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Загрузка...
        </div>
      )}
      <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 bg-white/80 px-2 py-0.5 rounded-md pointer-events-none">
        📋 Ctrl+V / 🖱️ Drag & Drop
      </div>
    </div>
  );
};