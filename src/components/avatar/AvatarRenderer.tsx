import { CyberGirlAvatar } from "./CyberGirlAvatar";
import { RobotAvatar } from "./RobotAvatar";
import type { AvatarMode, AvatarState } from "@types";

interface AvatarRendererProps {
  mode: AvatarMode;
  state: AvatarState;
}

export function AvatarRenderer({ mode, state }: AvatarRendererProps) {
  if (mode === "cyber-girl") return <CyberGirlAvatar state={state} />;
  return <RobotAvatar state={state} />;
}
