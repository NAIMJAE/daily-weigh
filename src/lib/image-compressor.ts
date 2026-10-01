/**
 * 브라우저 캔버스를 활용하여 이미지를 리사이징하고 WebP로 압축합니다.
 * 무료 1GB Supabase Storage 한도를 절약하기 위해 최대 너비 1080px, WebP 80% 압축.
 */
export async function compressImage(file: File, maxWidth = 1080, quality = 0.82): Promise<{ blob: Blob; dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context is not available"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // WebP 변환 시도, 미지원 시 JPEG fallback
        const mimeType = "image/webp";
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Image compression failed"));
              return;
            }
            const dataUrl = canvas.toDataURL(mimeType, quality);
            resolve({
              blob,
              dataUrl,
              sizeKb: Math.round(blob.size / 1024),
            });
          },
          mimeType,
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
