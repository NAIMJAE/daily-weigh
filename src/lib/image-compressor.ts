/**
 * 모바일(iOS Safari, Android Chrome, Samsung Internet, KakaoTalk 웹뷰 등) 및 데스크톱 환경에서
 * 카메라 실시간 촬영 사진 및 갤러리 사진을 가볍고 선명한 Base64 Data URL로 리사이징/압축합니다.
 *
 * - 크기: 최대 960px, JPEG 품질 0.78 (~40KB - 80KB의 초경량 Base64)
 * - Base64 Data URL 방식으로 세션 스토리지 보존, 100% 안정적인 즉시 미리보기 및 Supabase Storage 업로드 지원
 */
export async function compressImage(
  file: File | Blob,
  maxDimension = 960,
  quality = 0.78
): Promise<{ blob: Blob; dataUrl: string; sizeKb: number; mimeType: string }> {
  // 1. FileReader로 Data URL 읽기 (모든 브라우저 100% 호환)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const srcUrl = e.target?.result as string;
      if (!srcUrl) {
        reject(new Error("사진 데이터를 읽을 수 없습니다."));
        return;
      }

      const img = new Image();

      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (!width || !height) {
            reject(new Error("이미지 해상도를 읽을 수 없습니다."));
            return;
          }

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d", { alpha: false });
          if (!ctx) {
            reject(new Error("Canvas context를 생성할 수 없습니다."));
            return;
          }

          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // JPEG Base64 Data URL 생성
          const targetMime = "image/jpeg";
          const dataUrl = canvas.toDataURL(targetMime, quality);

          // Base64 -> Blob 복원
          const byteString = atob(dataUrl.split(",")[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: targetMime });
          const sizeKb = Math.round(blob.size / 1024);

          // GPU 캔버스 메모리 즉시 정리
          canvas.width = 0;
          canvas.height = 0;

          resolve({
            blob,
            dataUrl,
            sizeKb,
            mimeType: targetMime,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error("카메라 사진을 처리할 수 없습니다. 포맷을 확인해주세요."));
      };

      img.src = srcUrl;
    };

    reader.onerror = () => {
      reject(new Error("파일을 읽어오는 중 오류가 발생했습니다."));
    };

    reader.readAsDataURL(file);
  });
}
