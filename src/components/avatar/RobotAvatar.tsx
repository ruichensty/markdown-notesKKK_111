import type { AvatarProps } from "./types";

export function RobotAvatar({ state }: AvatarProps) {
  const thinking = state === "thinking";
  return (
    <svg viewBox="0 0 64 64" fill="none" className="ai-bot-svg" aria-hidden="true">
      <line
        x1="32"
        y1="6"
        x2="32"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="5" r="3" fill="currentColor" className="ai-bot-antenna" />
      <rect x="10" y="12" width="44" height="32" rx="12" fill="currentColor" opacity="0.16" />
      <rect x="10" y="12" width="44" height="32" rx="12" stroke="currentColor" strokeWidth="2.4" />
      <g className="ai-bot-eyes">
        <circle cx="24" cy="27" r={thinking ? "2.8" : "3.4"} fill="currentColor" />
        <circle cx="40" cy="27" r={thinking ? "2.8" : "3.4"} fill="currentColor" />
      </g>
      <path d="M26 34.5q6 4 12 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <g className="ai-bot-arms">
        <path d="M10 30H4m6 6H6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M54 30h6m-6 6h4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <rect x="22" y="48" width="20" height="8" rx="4" fill="currentColor" opacity="0.16" />
      <rect x="22" y="48" width="20" height="8" rx="4" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}
