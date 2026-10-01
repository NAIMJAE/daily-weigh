/**
 * 모바일(iOS/Android) 및 데스크톱 브라우저 환경에서 사진을 안정적으로 리사이징하고 압축합니다.
 * - URL.createObjectURL을 사용하여 모바일 메모리 크래시 방지
 * - 가로/세로 최대 1200px 기준 비율 유지 스케일링
 * - WebP 우선 압축 및 JPEG 자동 Fallback 지원
 */
export async function compressImage(
  file: File | Blob,
  maxDimension = 1200,
  quality = 0.8
): Promise<{ blob: Blob; dataUrl: string; sizeKb: number; mimeType: string }> {
  return new Promise((resolve, reject) => {
    // 1. Object URL 생성
    let objectUrl: string;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {
      reject(new Error("파일을 읽을 수 없습니다."));
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          reject(new Error("이미지 크기를 읽을 수 없습니다."));
          return;
        }

        // 가로/세로 중 긴 쪽을 maxDimension에 맞춤
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

        // 흰색 배경 채우기 (투명도 없는 깔끔한 렌더링)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        // 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height);

        // WebP 변환 시도 -> 안 되면 JPEG로 안전하게 Fallback
        const tryExport = (targetMime: "image/webp" | "image/jpeg") => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const dataUrl = canvas.toDataURL(targetMime, quality);
                resolve({
                  blob,
                  dataUrl,
                  sizeKb: Math.round(blob.size / 1024),
                  mimeType: targetMime,
                });
              } else if (targetMime === "image/webp") {
                // WebP 실패 시 JPEG로 2차 시도
                tryExport("image/jpeg");
              } else {
                reject(new Error("이미지 압축 및 변환에 실패했습니다."));
              }
            },
            targetMime,
            quality
          );
        };

        tryExport("image/webp");
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지 파일을 불러오는데 실패했습니다. 지원되는 이미지 포맷인지 확인해주세요."));
    };

    img.src = objectUrl;
  });
}
