import { CatAvatar } from "./CatAvatar";
import { CustomImageAvatar } from "./CustomImageAvatar";
import { CyberGirlAvatar } from "./CyberGirlAvatar";
import { RobotAvatar } from "./RobotAvatar";
import type { AvatarMode, AvatarState } from "@types";

interface AvatarRendererProps {
  mode: AvatarMode;
  state: AvatarState;
  customImageId?: string | null;
}

export function AvatarRenderer({ mode, state, customImageId }: AvatarRendererProps) {
  if (mode === "cyber-girl") return <CyberGirlAvatar state={state} />;
  if (mode === "cat") return <CatAvatar state={state} />;
  if (mode === "custom-image") {
    return <CustomImageAvatar state={state} imageId={customImageId ?? null} />;
  }
  return <RobotAvatar state={state} />;
}
