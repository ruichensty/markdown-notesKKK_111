export type AvatarState =
  "idle" | "thinking" | "speaking" | "happy" | "confused" | "disabled" | "error";

export type AvatarMode = "robot" | "cyber-girl" | "cat" | "custom-image";
export type AvatarSkin = "aurora" | "peach" | "midnight";
export type AvatarAnimation = "full" | "reduced" | "off";

export interface AvatarProps {
  state: AvatarState;
}
