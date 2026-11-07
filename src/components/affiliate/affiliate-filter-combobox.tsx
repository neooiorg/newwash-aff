"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";

type AffiliateOption = {
  id: string;
  name: string;
  code: string;
};

export function AffiliateFilterCombobox({
  affiliates,
  value,
  onValueChange,
}: {
  affiliates: AffiliateOption[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  const options = useMemo(() => [{ id: "", name: "Tất cả cộng tác viên", code: "" }, ...affiliates], [affiliates]);
  const selected = options.find((option) => option.id === value) ?? options[0];

  return (
    <Field className="w-full sm:w-72">
      <Combobox
        items={options}
        value={selected}
        onValueChange={(option) => onValueChange(option?.id ?? "")}
        itemToStringLabel={(option: AffiliateOption) => `${option.name} ${option.code}`.trim()}
        itemToStringValue={(option: AffiliateOption) => option.id || "all"}
        isItemEqualToValue={(option, current) => option.id === current.id}
      >
        <ComboboxTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between font-normal"
              aria-label="Chọn cộng tác viên"
            />
          }
        >
          <ComboboxValue>
            {(option: AffiliateOption) => (
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{option.name}</span>
                {option.code ? <span className="text-muted-foreground truncate text-xs">{option.code}</span> : null}
              </span>
            )}
          </ComboboxValue>
        </ComboboxTrigger>
        <ComboboxContent className="max-w-(--anchor-width) min-w-(--anchor-width)">
          <ComboboxInput showTrigger={false} placeholder="Tìm cộng tác viên" />
          <ComboboxEmpty>Không tìm thấy cộng tác viên.</ComboboxEmpty>
          <ComboboxList>
            {(option) => (
              <ComboboxItem key={option.id || "all"} value={option}>
                <span className="min-w-0 flex-1 truncate">{option.name}</span>
                {option.code ? <span className="text-muted-foreground text-xs">{option.code}</span> : null}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}
