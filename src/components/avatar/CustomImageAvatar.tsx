import type { AvatarState } from "@types";
import { useStoredImageUrl } from "@hooks";
import { RobotAvatar } from "./RobotAvatar";

interface CustomImageAvatarProps {
  state: AvatarState;
  imageId: string | null;
}

export function CustomImageAvatar({ state, imageId }: CustomImageAvatarProps) {
  const { url, loading } = useStoredImageUrl(imageId);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!url || failedUrl === url) {
    return (
      <span
        className={`custom-avatar-fallback ${loading ? "custom-avatar-fallback--loading" : ""}`}
      >
        <RobotAvatar state={state} />
      </span>
    );
  }

  return (
    <span className={`custom-avatar custom-avatar--${state}`}>
      <span className="custom-avatar-orbit" />
      <img
        src={url}
        alt=""
        className="custom-avatar-image"
        draggable={false}
        onError={() => setFailedUrl(url)}
      />
    </span>
  );
}
import { useState } from "react";
