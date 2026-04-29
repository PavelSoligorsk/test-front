// src/hooks/useImageUpload.js
import { useState } from 'react';

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const uploadImage = async (file) => {
    setIsUploading(true);
    setError(null);

    try {
      // Конвертируем файл в base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Получаем токен из localStorage
      const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      const token = session?.token;

      // Отправляем на сервер
      const response = await fetch('https://tests-production-46d5.up.railway.app/admin/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ image_data: base64 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      return data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки изображения';
      setError(message);
      console.error('Upload error:', err);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadImage, isUploading, error };
};