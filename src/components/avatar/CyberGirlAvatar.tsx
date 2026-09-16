import type { AvatarProps } from "./types";

export function CyberGirlAvatar({ state }: AvatarProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={`cyber-avatar cyber-avatar--${state}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="cyberHair"
          x1="17"
          y1="8"
          x2="49"
          y2="49"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8be9ff" />
          <stop offset="0.48" stopColor="#a88bff" />
          <stop offset="1" stopColor="#ff7ad9" />
        </linearGradient>
        <linearGradient
          id="cyberFace"
          x1="20"
          y1="18"
          x2="44"
          y2="45"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff4f9" />
          <stop offset="1" stopColor="#ffdce9" />
        </linearGradient>
        <filter id="cyberGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        className="cyber-avatar-aura"
        cx="32"
        cy="31"
        r="26"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.28"
      />
      <path
        className="cyber-avatar-hair-back"
        d="M16 34c0-16 7-25 17-25 10.5 0 17 9 16 26-.5 8.5-5 14-5 14H21s-5-6-5-15z"
        fill="url(#cyberHair)"
        opacity="0.9"
      />
      <path
        className="cyber-avatar-side-hair"
        d="M19 27c-5 7-4 17 3 24M45 27c5 7 4 17-3 24"
        stroke="#6ee7ff"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.75"
      />
      <ellipse cx="32" cy="30" rx="15" ry="16" fill="url(#cyberFace)" />
      <path
        className="cyber-avatar-bangs"
        d="M19 24c4-9 13-13 24-7 2 1 4 5 4 8-9-1-18-6-28-1z"
        fill="url(#cyberHair)"
      />
      <path
        className="cyber-avatar-chip"
        d="M44 18h7v7h-7zM47.5 15v3M47.5 25v3M41 21.5h3M51 21.5h3"
        stroke="#70f7ff"
        strokeWidth="1.4"
        strokeLinecap="round"
        filter="url(#cyberGlow)"
      />
      <g className="cyber-avatar-eyes">
        <path d="M24 31c1.3-2 4.3-2 5.5 0" stroke="#24213d" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M34.5 31c1.3-2 4.3-2 5.5 0"
          stroke="#24213d"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="27" cy="31" r="1.5" fill="#65f7ff" />
        <circle cx="37.5" cy="31" r="1.5" fill="#65f7ff" />
      </g>
      <path
        className="cyber-avatar-mouth"
        d="M29 38q3 2.2 6 0"
        stroke="#d64c8d"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path className="cyber-avatar-collar" d="M22 55c1-7 5-10 10-10s9 3 10 10" fill="#24213d" />
      <path
        d="M25 51h14"
        stroke="#77f8ff"
        strokeWidth="1.6"
        strokeLinecap="round"
        filter="url(#cyberGlow)"
      />
      <g className="cyber-avatar-dots" fill="currentColor">
        <circle cx="13" cy="21" r="1.4" />
        <circle cx="52" cy="35" r="1.1" />
        <circle cx="16" cy="45" r="0.9" />
      </g>
      <path
        className="cyber-avatar-error-mark"
        d="M48 12l5 5M53 12l-5 5"
        stroke="#ff5f8f"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
