import { useState } from 'react';
import { Platform } from 'react-native';
import API from '../android/app/src/config';

export const useUploadMedia = () => {
  const [urls, setUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (assets: any[]) => {
    if (!assets || assets.length === 0) return;

    const formData = new FormData();

    assets.forEach((file, i) => {
      const uri = Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri;
      const name = file.fileName || file.name || `file_${i}`;
      const ext = uri.split('.').pop()?.toLowerCase();

      const type =
        file.mimeType ||
        (ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'png'
          ? 'image/png'
          : ext === 'mp4'
          ? 'video/mp4'
          : 'application/octet-stream');

      formData.append('media[]', {
        uri,
        name,
        type,
      } as any);
    });

    try {
      setIsUploading(true);
      setError(null);

      const response = await fetch(`${API}/post/upload.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        },
        body: formData,
      });

      const data = await response.json();

      if (data.status === 'success' && Array.isArray(data.files)) {
        setUrls(prev => [...prev, ...data.files]);
      } else {
        throw new Error(data.message || 'เกิดข้อผิดพลาดระหว่างอัปโหลด');
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'ไม่สามารถอัปโหลดไฟล์ได้');
    } finally {
      setIsUploading(false);
    }
  };

  const remove = (url: string) => {
    setUrls(prev => prev.filter(item => item !== url));
  };

  return {
    upload,
    urls,
    remove,
    isUploading,
    error,
  };
};