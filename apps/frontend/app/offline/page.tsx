"use client";

// صفحه نمایش داده‌شده هنگام قطع اینترنت (توسط Service Worker)
export default function OfflinePage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="rounded-full bg-orange-50 p-6">
        <svg
          className="h-12 w-12 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3l18 18M8.111 8.111A7.5 7.5 0 0117.89 17.89M4.93 4.93A10 10 0 0119.07 19.07M12 20.01l.01-.011"
          />
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">You&apos;re Offline</h1>
        <p className="max-w-sm text-gray-500">
          No internet connection. Please check your network and try again.
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="btn btn-primary rounded-full px-8"
      >
        Try Again
      </button>
    </div>
  );
}
