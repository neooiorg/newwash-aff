import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

export function BookingSection({
  number,
  title,
  subtitle,
  children,
  id,
}: {
  number: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 py-6 sm:py-7">
      <div className="mb-5 flex items-start gap-3">
        <Badge variant="secondary" className="mt-0.5 size-6 rounded-full p-0 tabular-nums">
          {number}
        </Badge>
        <div className="flex flex-col gap-0.5">
          <h2 id={`${id}-title`} className="text-base font-semibold tracking-tight sm:text-lg">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
