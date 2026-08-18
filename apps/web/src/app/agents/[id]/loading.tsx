export default function AgentDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-32 animate-pulse rounded bg-[var(--surface-muted)]" />
      <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-white"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-[var(--border)] bg-white" />
    </div>
  );
}
