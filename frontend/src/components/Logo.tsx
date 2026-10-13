export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="mv-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#mv-logo)" />
      <path d="M20 22h24a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V26a4 4 0 0 1 4-4Z" fill="none" stroke="#fff" strokeWidth="3.5" />
      <circle cx="26" cy="31" r="3.2" fill="#fff" />
      <path d="m18 43 9-8 6 5 5-4 9 7" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}
