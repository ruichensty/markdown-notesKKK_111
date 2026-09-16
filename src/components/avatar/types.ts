export type AvatarState = "idle" | "thinking" | "speaking" | "disabled" | "error";
export type AvatarMode = "robot" | "cyber-girl";

export interface AvatarProps {
  state: AvatarState;
}
