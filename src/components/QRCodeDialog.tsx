import { memo, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useToast } from "@context";

interface QRCodeDialogProps {
  open: boolean;
  url: string;
  hasCurrentNote: boolean;
  onClose: () => void;
}

function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function QRCodeDialogBase({ open, url, hasCurrentNote, onClose }: QRCodeDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const { showToast } = useToast();
  const isLocal = useMemo(() => isLocalhostUrl(url), [url]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    })
      .then(data => {
        if (!cancelled) setQrDataUrl(data);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showToast("链接已复制", "success");
    } catch {
      showToast("复制失败，请手动复制链接", "error");
    }
  };

  if (!open) return null;

  return (
    <div className="qr-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="qr-dialog-card"
        role="dialog"
        aria-modal="true"
        aria-label="手机扫码打开"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="qr-dialog-header">
          <div>
            <h2>手机扫码打开</h2>
            <p>
              {hasCurrentNote ? "在手机浏览器中尝试打开当前笔记" : "在手机浏览器中打开当前应用页面"}
            </p>
          </div>
          <button type="button" className="qr-dialog-close" onClick={onClose} title="关闭">
            ×
          </button>
        </div>

        <div className="qr-dialog-code">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="当前应用地址二维码" />
          ) : (
            <span>二维码生成失败</span>
          )}
        </div>

        {isLocal && (
          <div className="qr-dialog-warning">
            当前地址是 localhost/127.0.0.1，手机通常无法直接访问。请使用局域网 IP 或部署后的地址。
          </div>
        )}

        <div className="qr-dialog-note">
          {hasCurrentNote
            ? "扫码会带上当前笔记定位信息。只有手机端已有这篇笔记时才会自动打开，数据不会自动同步。"
            : "扫码只会打开应用页面。笔记数据存储在各自浏览器中，不会自动同步。"}
        </div>

        <div className="qr-dialog-url" title={url}>
          {url}
        </div>

        <div className="qr-dialog-actions">
          <button type="button" className="qr-dialog-copy" onClick={copyUrl}>
            复制链接
          </button>
          <button type="button" className="qr-dialog-secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export const QRCodeDialog = memo(QRCodeDialogBase);
