// 입력/업로드 처리 모듈 (요구사항 정의서 07-④)
// 파일 형식/크기를 검증하고, 저장 용량을 아끼기 위해 이미지를 줄여서 dataURL로 만듭니다.

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_WIDTH = 480;

export class UploadError extends Error {}

export function validateImageFile(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new UploadError("사진 파일만 올릴 수 있어요. (jpg, png 등)");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new UploadError("파일 용량이 너무 커요. 15MB 이하 사진으로 다시 시도해 주세요.");
  }
}

/** 이미지 소스(사진 파일이든 카메라 프레임이든)를 정해진 크기로 줄여 JPEG dataURL로 만듭니다. */
function drawScaledToDataUrl(source: CanvasImageSource, srcWidth: number, srcHeight: number): string {
  const scale = Math.min(1, MAX_WIDTH / srcWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(srcWidth * scale));
  canvas.height = Math.max(1, Math.round(srcHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new UploadError("사진을 처리하지 못했어요. 다시 시도해 주세요.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export async function fileToCompressedDataUrl(file: File): Promise<string> {
  validateImageFile(file);

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new UploadError("사진을 불러오지 못했어요. 다시 시도해 주세요."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new UploadError("사진을 읽지 못했어요. 다른 사진으로 시도해 주세요."));
    el.src = rawDataUrl;
  });

  return drawScaledToDataUrl(img, img.width, img.height);
}

/** 웹캠 <video>의 현재 화면을 캡처해 같은 방식으로 압축한 dataURL로 만듭니다. */
export function captureVideoFrameToDataUrl(video: HTMLVideoElement): string {
  return drawScaledToDataUrl(video, video.videoWidth, video.videoHeight);
}
