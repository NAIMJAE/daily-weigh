/**
 * 모바일(iOS Safari, Android Chrome, Samsung Internet, KakaoTalk 웹뷰 등) 및 데스크톱 환경에서
 * 카메라 실시간 촬영 사진 및 갤러리 사진을 완벽하게 디코딩하고 가볍고 선명한 Base64 Data URL로 리사이징/압축합니다.
 *
 * - 크기: 최대 960px, JPEG 품질 0.8 (~50KB - 100KB의 초경량 Base64)
 * - EXIF 방향(세로/가로) 자동 보정 및 비동기 하드웨어 디코딩 보장 (하얀 빈 화면 / 렌더링 누락 100% 방지)
 * - Base64 Data URL 방식으로 세션 스토리지 보존, 100% 안정적인 즉시 미리보기 및 Supabase Storage 업로드 지원
 */
export async function compressImage(
  file: File | Blob,
  maxDimension = 960,
  quality = 0.8
): Promise<{ blob: Blob; dataUrl: string; sizeKb: number; mimeType: string }> {
  const targetMime = "image/jpeg";

  // Helper: Canvas에서 Base64 DataURL 및 Blob 추출
  const canvasToResult = (
    canvas: HTMLCanvasElement
  ): { blob: Blob; dataUrl: string; sizeKb: number; mimeType: string } => {
    const dataUrl = canvas.toDataURL(targetMime, quality);
    const parts = dataUrl.split(",");
    const byteString = atob(parts[1] || "");
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: targetMime });
    const sizeKb = Math.round(blob.size / 1024);

    // GPU 메모리 정리
    canvas.width = 0;
    canvas.height = 0;

    return { blob, dataUrl, sizeKb, mimeType: targetMime };
  };

  // 1순위: createImageBitmap (최신 브라우저, EXIF 자동 회전, 비동기 래스터라이징 완료 보장)
  if (typeof window !== "undefined" && typeof createImageBitmap === "function") {
    try {
      // imageOrientation: 'from-image'로 EXIF 방향 메타데이터 완벽 준수
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch {
        // 일부 브라우저 옵션 미지원 시 기본 호출
        bitmap = await createImageBitmap(file);
      }

      let { width, height } = bitmap;
      if (width > 0 && height > 0) {
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
          ctx.fillStyle = "#18181B"; // 세련된 다크 기본 배경
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close(); // Bitmap 즉시 해제

          return canvasToResult(canvas);
        }
      }
    } catch (bitmapErr) {
      console.warn("createImageBitmap failed, trying HTMLImageElement + decode:", bitmapErr);
    }
  }

  // 2순위: HTMLImageElement + img.decode() (비동기 디코딩 완료 대기)
  return new Promise((resolve, reject) => {
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      objectUrl = null;
    }

    const img = new Image();

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };

    const processLoadedImage = async () => {
      try {
        // img.decode()가 지원되면 실제 픽셀 비동기 래스터라이징이 끝날 때까지 대기 (화면 하얗게 렌더링되는 현상 방지)
        if (typeof img.decode === "function") {
          try {
            await img.decode();
          } catch {
            // decode 실패 시에도 onload가 발생했으므로 계속 진행
          }
        }

        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          cleanup();
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
          cleanup();
          reject(new Error("Canvas context를 생성할 수 없습니다."));
          return;
        }

        ctx.fillStyle = "#18181B";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        cleanup();
        resolve(canvasToResult(canvas));
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    img.onload = () => {
      processLoadedImage();
    };

    img.onerror = () => {
      cleanup();
      // 3순위 폴백: FileReader readAsDataURL
      const reader = new FileReader();
      reader.onload = () => {
        const fallbackImg = new Image();
        fallbackImg.onload = async () => {
          if (typeof fallbackImg.decode === "function") {
            try { await fallbackImg.decode(); } catch {}
          }
          let w = fallbackImg.naturalWidth || fallbackImg.width;
          let h = fallbackImg.naturalHeight || fallbackImg.height;
          if (w > maxDimension || h > maxDimension) {
            if (w > h) {
              h = Math.round((h * maxDimension) / w);
              w = maxDimension;
            } else {
              w = Math.round((w * maxDimension) / h);
              h = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d", { alpha: false });
          if (ctx) {
            ctx.fillStyle = "#18181B";
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(fallbackImg, 0, 0, w, h);
            resolve(canvasToResult(canvas));
          } else {
            reject(new Error("Canvas context 생성 실패"));
          }
        };
        fallbackImg.onerror = () => reject(new Error("사진 파일 포맷을 디코딩할 수 없습니다."));
        fallbackImg.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("사진 파일을 읽는 중 오류가 발생했습니다."));
      reader.readAsDataURL(file);
    };

    if (objectUrl) {
      img.src = objectUrl;
    } else {
      // Object URL 생성이 안 되는 환경이면 즉시 FileReader 사용
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
      reader.readAsDataURL(file);
    }
  });
}
