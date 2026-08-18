export default function WinThorInstanceDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-40 animate-pulse rounded bg-[var(--surface-muted)]" />
      <div className="space-y-3">
        <div className="h-8 w-80 max-w-full animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-[var(--surface-muted)]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-white"
          />
        ))}
      </div>
    </div>
  );
}
