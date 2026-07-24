export function EmptyStateIllustration() {
  return (
    <svg
      width="120"
      height="100"
      viewBox="0 0 120 100"
      fill="none"
      className="empty-state-illustration"
    >
      <g className="empty-illustration-notebook">
        <rect
          x="18"
          y="20"
          width="56"
          height="68"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-muted-foreground/20"
        />
        <rect
          x="24"
          y="26"
          width="32"
          height="3"
          rx="1.5"
          fill="currentColor"
          className="text-muted-foreground/15"
        />
        <rect
          x="24"
          y="34"
          width="44"
          height="2"
          rx="1"
          fill="currentColor"
          className="text-muted-foreground/10"
        />
        <rect
          x="24"
          y="40"
          width="38"
          height="2"
          rx="1"
          fill="currentColor"
          className="text-muted-foreground/10"
        />
        <rect
          x="24"
          y="46"
          width="42"
          height="2"
          rx="1"
          fill="currentColor"
          className="text-muted-foreground/10"
        />
        <rect
          x="24"
          y="52"
          width="28"
          height="2"
          rx="1"
          fill="currentColor"
          className="text-muted-foreground/10"
        />
        <rect
          x="24"
          y="58"
          width="40"
          height="2"
          rx="1"
          fill="currentColor"
          className="text-muted-foreground/10"
        />
        <rect
          x="24"
          y="64"
          width="20"
          height="2"
          rx="1"
          fill="currentColor"
          className="text-muted-foreground/10"
        />
        <path
          d="M18 25h-4a1 1 0 00-1 1v58a1 1 0 001 1h4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-muted-foreground/15"
          fill="none"
        />
        <path
          d="M74 25h4a1 1 0 011 1v58a1 1 0 01-1 1h-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-muted-foreground/15"
          fill="none"
        />
      </g>

      <g className="empty-illustration-pencil">
        <rect
          x="78"
          y="12"
          width="6"
          height="50"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          className="text-primary/30"
          transform="rotate(-12, 81, 37)"
        />
        <path
          d="M76.5 60.5l-2 7 7.5-1.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary/25"
          fill="none"
          transform="rotate(-12, 81, 37)"
        />
        <line
          x1="81"
          y1="16"
          x2="81"
          y2="58"
          stroke="currentColor"
          strokeWidth="0.8"
          className="text-primary/15"
          transform="rotate(-12, 81, 37)"
        />
      </g>

      <g className="empty-illustration-dots">
        <circle cx="96" cy="82" r="2" fill="currentColor" className="text-muted-foreground/20" />
        <circle cx="106" cy="76" r="2" fill="currentColor" className="text-muted-foreground/15" />
        <circle cx="100" cy="90" r="2" fill="currentColor" className="text-muted-foreground/10" />
      </g>
    </svg>
  );
}
