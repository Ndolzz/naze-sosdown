export function IconAlert({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M8 1.6L14.6 13.2C14.9 13.7 14.5 14.4 13.9 14.4H2.1C1.5 14.4 1.1 13.7 1.4 13.2L8 1.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8 6.2V9.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.6" r="0.75" fill="currentColor" />
    </svg>
  );
}
