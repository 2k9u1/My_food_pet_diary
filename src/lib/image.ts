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

  const scale = Math.min(1, MAX_WIDTH / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return rawDataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}
