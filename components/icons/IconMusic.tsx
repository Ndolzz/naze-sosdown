export function IconMusic({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M13.5 2.5L6 4.2V11.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 2.5V9.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="4.5" cy="12" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="10.6" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
