"use client";

import { useEffect, useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

type AddressSuggestion = {
  id: string;
  display: string;
  name: string;
  address: string;
};

export function VietMapAddressInput({
  id,
  value,
  onValueChange,
  placeholder,
}: {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [selected, setSelected] = useState<AddressSuggestion | null>(null);

  useEffect(() => {
    if (value.trim().length < 2 || selected?.display === value) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetch(`/api/vietmap/autocomplete?q=${encodeURIComponent(value.trim())}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("VietMap unavailable");
          return response.json();
        })
        .then((data: { suggestions?: AddressSuggestion[] }) => setSuggestions(data.suggestions ?? []))
        .catch((cause) => {
          if (cause instanceof DOMException && cause.name === "AbortError") return;
          setSuggestions([]);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [selected, value]);

  return (
    <Combobox
      items={suggestions}
      value={selected}
      inputValue={value}
      onInputValueChange={(nextValue, eventDetails) => {
        // Base UI also emits an input-value change while committing an item.
        // Let onValueChange own that transition so the selected address is not
        // immediately cleared again inside the drawer.
        if (eventDetails.isItemPress) return;
        setSelected(null);
        onValueChange(nextValue);
      }}
      onValueChange={(option) => {
        if (!option) return;
        setSelected(option);
        onValueChange(option.display);
        setSuggestions([]);
      }}
      itemToStringLabel={(option: AddressSuggestion) => option.display}
      itemToStringValue={(option: AddressSuggestion) => option.id}
      isItemEqualToValue={(option, current) => option.id === current.id}
    >
      <ComboboxInput
        id={id}
        className="w-full"
        showTrigger={false}
        showClear={Boolean(value)}
        placeholder={placeholder}
        autoComplete="street-address"
      />
      <ComboboxContent className="max-w-(--anchor-width) min-w-(--anchor-width)">
        <ComboboxEmpty>Không tìm thấy địa chỉ phù hợp.</ComboboxEmpty>
        <ComboboxList>
          {(option) => (
            <ComboboxItem key={option.id} value={option} className="items-start py-2">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-medium">{option.name}</span>
                <span className="text-muted-foreground line-clamp-2 text-xs">{option.address}</span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
