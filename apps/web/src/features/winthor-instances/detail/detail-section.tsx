interface DetailSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function DetailSection({
  title,
  description,
  children,
}: DetailSectionProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      </div>
      {children}
    </section>
  );
}
