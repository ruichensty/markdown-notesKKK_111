export type AvatarState =
  "idle" | "thinking" | "speaking" | "happy" | "confused" | "disabled" | "error";
export type AvatarMode = "robot" | "cyber-girl";
export type AvatarAnimation = "full" | "reduced" | "off";

export interface AvatarProps {
  state: AvatarState;
}
