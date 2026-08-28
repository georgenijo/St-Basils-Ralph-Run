export default function PublicPageLoading() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center bg-cream-50 px-4"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="flex items-center gap-3 text-sm font-medium text-burgundy-700">
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-burgundy-200 border-t-burgundy-700 motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span>Loading page…</span>
      </div>
    </div>
  )
}
