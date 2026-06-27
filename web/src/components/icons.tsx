// White outline glyphs for the action rail. Bare strokes that survive over any
// AI image via drop-shadow (applied by the rail container). 2px stroke.

type IconProps = {
  className?: string;
  filled?: boolean;
};

export function FlameIcon({ className, filled }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2c1.5 3 4.5 4.8 4.5 9a4.5 4.5 0 0 1-9 0c0-1.2.4-2.2 1-3 .2 1.2.9 2 1.8 2.2C9.5 9 10 6 12 2Z" />
      <path d="M12 22a6 6 0 0 0 6-6c0-3-2-5.4-3.6-7.2" opacity={filled ? 0 : 1} />
    </svg>
  );
}

export function CommentIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9.06 9.06 0 0 1-3.9-.85L3 21l1.85-5.6A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" />
    </svg>
  );
}

export function ShareIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
  );
}

export function MoreIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
