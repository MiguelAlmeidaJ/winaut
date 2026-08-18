interface DetailSectionProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function DetailSection({
  title,
  description,
  action,
  children,
}: DetailSectionProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
