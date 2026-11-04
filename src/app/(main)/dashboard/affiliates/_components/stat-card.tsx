import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-lg border">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-3xl leading-none font-medium tracking-tight tabular-nums">{value}</p>
        <p className="text-muted-foreground text-sm">{note}</p>
      </CardContent>
    </Card>
  );
}
