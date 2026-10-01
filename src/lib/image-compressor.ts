/**
 * 모바일(삼성 브라우저, Chrome, Safari) 및 데스크톱 환경에서 사진을 안정적으로 리사이징하고 압축합니다.
 * - 갤럭시 S24/S25/S26 Ultra 등 초고화소(50MP/200MP) 카메라 원본 대응: createImageBitmap 하드웨어 가속 우선 사용
 * - Canvas 2D + WebP/JPEG 안전한 다중 Fallback
 */
export async function compressImage(
  file: File | Blob,
  maxDimension = 1200,
  quality = 0.82
): Promise<{ blob: Blob; dataUrl: string; sizeKb: number; mimeType: string }> {
  // 1. createImageBitmap 지원 브라우저 (삼성 인터넷, Chrome 등 안드로이드 최적화)
  if (typeof window !== "undefined" && "createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file);
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
      console.warn("createImageBitmap failed, falling back to Image():", bitmapErr);
    }
  }

  // 2. Image() + ObjectURL Fallback
  return new Promise((resolve, reject) => {
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      // FileReader로 2차 시도
      const reader = new FileReader();
      reader.onload = (e) => {
        processWithImageTag(e.target?.result as string, resolve, reject, maxDimension, quality);
      };
      reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
      reader.readAsDataURL(file);
      return;
    }

    processWithImageTag(objectUrl, resolve, reject, maxDimension, quality, () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    });
  });
}

function processWithImageTag(
  src: string,
  resolve: (val: { blob: Blob; dataUrl: string; sizeKb: number; mimeType: string }) => void,
  reject: (reason?: any) => void,
  maxDimension: number,
  quality: number,
  onCleanup?: () => void
) {
  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = async () => {
    if (onCleanup) onCleanup();
    try {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        reject(new Error("이미지 크기를 읽을 수 없습니다."));
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
    if (onCleanup) onCleanup();
    reject(new Error("이미지를 불러올 수 없습니다. 포맷을 확인해주세요."));
  };

  img.src = src;
}

function exportCanvas(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<{ blob: Blob; dataUrl: string; sizeKb: number; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const tryExport = (targetMime: "image/webp" | "image/jpeg") => {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            const dataUrl = canvas.toDataURL(targetMime, quality);
            resolve({
              blob,
              dataUrl,
              sizeKb: Math.round(blob.size / 1024),
              mimeType: targetMime,
            });
          } else if (targetMime === "image/webp") {
            tryExport("image/jpeg");
          } else {
            // toBlob 실패 시 toDataURL로 직접 DataURL 생성 후 Blob 복원
            try {
              const dataUrl = canvas.toDataURL("image/jpeg", quality);
              const byteString = atob(dataUrl.split(",")[1]);
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              const fallbackBlob = new Blob([ab], { type: "image/jpeg" });
              resolve({
                blob: fallbackBlob,
                dataUrl,
                sizeKb: Math.round(fallbackBlob.size / 1024),
                mimeType: "image/jpeg",
              });
            } catch (fallbackErr) {
              reject(new Error("이미지 압축 변환에 실패했습니다."));
            }
          }
        },
        targetMime,
        quality
      );
    };

    tryExport("image/webp");
  });
}
