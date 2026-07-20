import { useState } from 'react';
import apiClient from '../api';

export function useImageUpload() {
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

      const response = await apiClient.post('/admin/upload-image', {
        image_data: base64,
      });

      return response.data.url;
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
}
