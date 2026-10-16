export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#126656" />
      <path d="M8 8h6v6H8zM18 8h6v6h-6zM8 18h6v6H8z" fill="#d7f2ea" />
      <path d="M18.5 21.5l2.5 2.5 4.5-5" stroke="#f5c451" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
