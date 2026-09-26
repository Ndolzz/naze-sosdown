export function IconLink({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M6.5 9.5L9.5 6.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M7.2 4.6L8.1 3.7C9.1 2.7 10.7 2.7 11.7 3.7C12.7 4.7 12.7 6.3 11.7 7.3L10.8 8.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M8.8 11.4L7.9 12.3C6.9 13.3 5.3 13.3 4.3 12.3C3.3 11.3 3.3 9.7 4.3 8.7L5.2 7.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
