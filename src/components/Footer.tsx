import { useState } from "react";
import { PolicyModal } from "./PolicyModal";

export function Footer() {
  const [open, setOpen] = useState<"privacy" | "terms" | null>(null);
  return (
    <footer className="app-footer">
      <span>[기관명을 입력하세요]</span>
      <span>·</span>
      <button className="link" onClick={() => setOpen("privacy")}>
        개인정보 처리방침
      </button>
      <button className="link" onClick={() => setOpen("terms")}>
        이용약관
      </button>
      <span>·</span>
      <span>문의: [담당자 연락처를 입력하세요]</span>
      <span>·</span>
      <span>시행일 2026-09-13</span>
      <PolicyModal kind={open} onClose={() => setOpen(null)} />
    </footer>
  );
}
