/**
 * 모바일(iOS Safari, Android Chrome, Samsung Internet, KakaoTalk 웹뷰 등) 및 데스크톱 환경에서
 * 카메라 실시간 촬영 사진(대용량 HEIC/JPEG, EXIF 회전값 포함) 및 갤러리 사진을
 * 안전하고 빠르게 리사이징 및 압축합니다.
 */
export async function compressImage(
  file: File | Blob,
  maxDimension = 1200,
  quality = 0.85
): Promise<{ blob: Blob; dataUrl: string; sizeKb: number; mimeType: string }> {
  // 1. createImageBitmap 시도 (EXIF orientation 자동 보정 지원)
  if (typeof window !== "undefined" && "createImageBitmap" in window) {
    try {
      // imageOrientation: 'from-image'로 모바일 카메라 회전(EXIF) 자동 처리
      const bitmap = await (createImageBitmap as any)(file, {
        imageOrientation: "from-image",
      }).catch(() => createImageBitmap(file));

      let width = bitmap.width;
      let height = bitmap.height;

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

      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        return await exportCanvas(canvas, quality);
      }
    } catch (bitmapErr) {
      console.warn("createImageBitmap failed, falling back to FileReader + Image():", bitmapErr);
    }
  }

  // 2. FileReader + Image() Fallback (crossOrigin 미설정으로 Safari blob/data URL 보안 오류 방지)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        reject(new Error("사진 데이터를 읽을 수 없습니다."));
        return;
      }

      const img = new Image();
      // 주의: 로컬 dataUrl에 crossOrigin = "anonymous"를 설정하면 Safari/iOS에서 CORS 보안 에러가 발생하므로 설정하지 않음

      img.onload = async () => {
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

          const result = await exportCanvas(canvas, quality);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error("카메라 사진을 처리할 수 없습니다. 포맷을 확인해주세요."));
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      reject(new Error("파일을 읽어오는 중 오류가 발생했습니다."));
    };

    reader.readAsDataURL(file);
  });
}

function exportCanvas(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<{ blob: Blob; dataUrl: string; sizeKb: number; mimeType: string }> {
  return new Promise((resolve, reject) => {
    // 모바일 전 기기(iOS/Android) 100% 호환을 위해 JPEG 우선 압축
    const targetMime = "image/jpeg";

    canvas.toBlob(
      (blob) => {
        if (blob && blob.size > 0) {
          try {
            const dataUrl = canvas.toDataURL(targetMime, quality);
            resolve({
              blob,
              dataUrl,
              sizeKb: Math.round(blob.size / 1024),
              mimeType: targetMime,
            });
          } catch {
            // toDataURL 실패 시 FileReader로 Blob에서 DataURL 생성
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                blob,
                dataUrl: reader.result as string,
                sizeKb: Math.round(blob.size / 1024),
                mimeType: targetMime,
              });
            };
            reader.onerror = () => reject(new Error("Blob 변환에 실패했습니다."));
            reader.readAsDataURL(blob);
          }
        } else {
          // toBlob 미지원 또는 실패 시 toDataURL -> Blob 수동 복원
          try {
            const dataUrl = canvas.toDataURL(targetMime, quality);
            const byteString = atob(dataUrl.split(",")[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const fallbackBlob = new Blob([ab], { type: targetMime });
            resolve({
              blob: fallbackBlob,
              dataUrl,
              sizeKb: Math.round(fallbackBlob.size / 1024),
              mimeType: targetMime,
            });
          } catch (fallbackErr) {
            reject(new Error("이미지 압축 변환에 실패했습니다."));
          }
        }
      },
      targetMime,
      quality
    );
  });
}
