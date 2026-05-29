"use client";

import { Link as LinkIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { CopyButton } from "@/components/CopyButton";

interface ShareLinkBarProps {
  shareUrl: string;
  className?: string;
}

export function ShareLinkBar({ shareUrl, className = "" }: ShareLinkBarProps) {
  // Truncate the URL for display
  const displayUrl =
    shareUrl.length > 50
      ? shareUrl.slice(0, 50) + "..."
      : shareUrl;

  return (
    <div
      className={`card flex flex-col sm:flex-row items-center gap-4 p-4 ${className}`}
    >
      {/* Left: Link icon + URL */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <LinkIcon size={18} className="text-ink-muted shrink-0" />
        <span className="text-sm font-mono text-ink-muted truncate">
          {displayUrl}
        </span>
      </div>

      {/* Center: CopyButton */}
      <div className="flex-shrink-0">
        <CopyButton text={shareUrl} icon="link" label="share link" />
      </div>

      {/* Right: QR Code */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1">
        <div className="bg-white rounded-lg p-2">
          <QRCodeSVG
            value={shareUrl}
            size={96}
            bgColor="#ffffff"
            fgColor="#c9a84c"
            level="M"
          />
        </div>
        <span className="text-[10px] text-ink-muted">
          Scan to view on mobile
        </span>
      </div>
    </div>
  );
}
