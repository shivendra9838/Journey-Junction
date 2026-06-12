type LoadingStateProps = {
  message?: string;
  fullscreen?: boolean;
  className?: string;
};

export default function LoadingState({
  message = "Loading your travel experience...",
  fullscreen = false,
  className = "",
}: LoadingStateProps) {
  const baseClass = fullscreen
    ? "min-h-screen bg-[#f8f5f0]"
    : "min-h-[260px] rounded-[1.75rem] border border-stone-100 bg-white/90 shadow-sm";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center px-6 py-12 text-center ${baseClass} ${className}`}
    >
      <div className="flex flex-col items-center">
        <img
          src="/infinite-spinner.svg"
          alt=""
          aria-hidden="true"
          className="h-16 w-32 object-contain"
        />
        <p className="mt-4 max-w-xs text-sm font-semibold text-stone-500">{message}</p>
        <span className="sr-only">{message}</span>
      </div>
    </div>
  );
}
