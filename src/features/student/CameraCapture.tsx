import { useEffect, useRef, useState } from "react";
import { captureVideoFrameToDataUrl } from "../../lib/image";

// PC 웹캠·모바일 카메라를 브라우저에서 직접 켜서 그 자리에서 사진을 찍는 화면입니다.
// (모바일에서는 사진첩 선택 시 이미 "촬영하기"가 함께 뜨지만, PC에서는 그게 없어서
// 이 화면이 따로 필요합니다.)
export function CameraCapture({
  onCapture,
  onCancel,
}: {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("이 브라우저에서는 카메라를 바로 켤 수 없어요. 사진첩에서 선택해 주세요.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        if (!cancelled) {
          setError("카메라를 켤 수 없어요. 브라우저의 카메라 권한을 허용했는지 확인하거나, 사진첩에서 선택해 주세요.");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  function handleCapture() {
    if (!videoRef.current) return;
    const dataUrl = captureVideoFrameToDataUrl(videoRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(dataUrl);
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div
        style={{
          borderRadius: 14,
          overflow: "hidden",
          background: "#000",
          aspectRatio: "4 / 3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {error ? (
          <p style={{ color: "#fff", fontSize: 13, padding: 16, textAlign: "center" }}>{error}</p>
        ) : (
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onCancel}>
          취소
        </button>
        <button className="btn btn-primary" style={{ flex: 2 }} disabled={!ready || !!error} onClick={handleCapture}>
          📸 지금 촬영하기
        </button>
      </div>
    </div>
  );
}
