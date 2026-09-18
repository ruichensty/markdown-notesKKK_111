import type { AvatarProps } from "@types";

export function CatAvatar({ state }: AvatarProps) {
  const thinking = state === "thinking";
  const happy = state === "happy";
  const confused = state === "confused";

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={`cat-avatar cat-avatar--${state}`}
      aria-hidden="true"
    >
      <path
        className="cat-avatar-tail"
        d="M46 47c9 1 11-8 6-12-2-2-5-1-5 2 0 2 3 2 4 1"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        className="cat-avatar-body"
        d="M19 53c1-9 6-14 13-14s12 5 13 14"
        fill="var(--avatar-soft)"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        className="cat-avatar-head"
        d="M15 28c0-6 2-10 6-13l-1-9 9 6c2-.5 4-.5 6 0l9-6-1 9c4 3 6 7 6 13 0 11-7 17-17 17s-17-6-17-17z"
        fill="var(--avatar-surface)"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M22 11l1 7 5-4zM42 11l-1 7-5-4z" fill="var(--avatar-accent)" opacity="0.7" />
      <g
        className="cat-avatar-eyes"
        stroke="var(--avatar-ink)"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        {happy ? (
          <>
            <path d="M22 28q3-4 6 0" />
            <path d="M36 28q3-4 6 0" />
          </>
        ) : confused ? (
          <>
            <path d="M22 27h6" />
            <path d="M36 29h6" />
          </>
        ) : (
          <>
            <ellipse
              cx="25"
              cy="28"
              rx={thinking ? "1.7" : "2.2"}
              ry="3"
              fill="var(--avatar-ink)"
              stroke="none"
            />
            <ellipse
              cx="39"
              cy="28"
              rx={thinking ? "1.7" : "2.2"}
              ry="3"
              fill="var(--avatar-ink)"
              stroke="none"
            />
          </>
        )}
      </g>
      <path d="M30 33h4l-2 2z" fill="var(--avatar-accent)" />
      <path
        className="cat-avatar-mouth"
        d="M32 35c-1 3-5 3-6 1m6-1c1 3 5 3 6 1"
        stroke="var(--avatar-ink)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.65">
        <path d="M21 34l-8-2M21 37l-8 2M43 34l8-2M43 37l8 2" />
      </g>
      <path
        className="cat-avatar-spark"
        d="M51 15v6m-3-3h6"
        stroke="var(--avatar-accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
