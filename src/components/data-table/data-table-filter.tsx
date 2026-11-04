"use client";

import { Filter, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DataTableFilterDefinition<TData> {
  column: keyof TData & string;
  label: string;
  variant: "text" | "select" | "date";
  options?: { value: string; label: string }[];
}

export interface DataTableFilterRule {
  id: number;
  column: string;
  operator: string;
  value: string;
}

const operators = {
  text: [
    { value: "contains", label: "Chứa" },
    { value: "notContains", label: "Không chứa" },
    { value: "is", label: "Là" },
    { value: "isNot", label: "Không là" },
    { value: "startsWith", label: "Bắt đầu bằng" },
    { value: "endsWith", label: "Kết thúc bằng" },
    { value: "isEmpty", label: "Để trống" },
    { value: "isNotEmpty", label: "Có giá trị" },
  ],
  select: [
    { value: "is", label: "Là" },
    { value: "isNot", label: "Không là" },
    { value: "isEmpty", label: "Để trống" },
    { value: "isNotEmpty", label: "Có giá trị" },
  ],
  date: [
    { value: "is", label: "Đúng ngày" },
    { value: "before", label: "Trước ngày" },
    { value: "after", label: "Sau ngày" },
    { value: "isEmpty", label: "Để trống" },
    { value: "isNotEmpty", label: "Có giá trị" },
  ],
} as const;

export function isActiveDataTableFilter(rule: DataTableFilterRule) {
  return rule.operator === "isEmpty" || rule.operator === "isNotEmpty" || Boolean(rule.value.trim());
}

export function matchesDataTableFilter<TData>(
  row: TData,
  rule: DataTableFilterRule,
  definitions: DataTableFilterDefinition<TData>[],
) {
  const definition = definitions.find((item) => item.column === rule.column);
  if (!definition) return true;
  const raw = String(row[definition.column] ?? "");
  if (rule.operator === "isEmpty") return !raw.trim();
  if (rule.operator === "isNotEmpty") return Boolean(raw.trim());
  if (!rule.value.trim()) return true;
  const value = rule.value.trim();
  if (definition.variant === "date") {
    const day = raw.slice(0, 10);
    if (rule.operator === "before") return day < value;
    if (rule.operator === "after") return day > value;
    return day === value;
  }
  const cell = raw.toLocaleLowerCase("vi");
  const query = value.toLocaleLowerCase("vi");
  switch (rule.operator) {
    case "notContains":
      return !cell.includes(query);
    case "is":
      return cell === query;
    case "isNot":
      return cell !== query;
    case "startsWith":
      return cell.startsWith(query);
    case "endsWith":
      return cell.endsWith(query);
    default:
      return cell.includes(query);
  }
}

interface DataTableFilterProps<TData> {
  definitions: DataTableFilterDefinition<TData>[];
  rules: DataTableFilterRule[];
  onChange: (rules: DataTableFilterRule[]) => void;
  joinOperator: "and" | "or";
  onJoinOperatorChange: (value: "and" | "or") => void;
}

export function DataTableFilter<TData>({
  definitions,
  rules,
  onChange,
  joinOperator,
  onJoinOperatorChange,
}: DataTableFilterProps<TData>) {
  const activeCount = rules.filter(isActiveDataTableFilter).length;

  function updateRule(id: number, patch: Partial<DataTableFilterRule>) {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  }

  function addRule() {
    const first = definitions[0];
    if (!first) return;
    onChange([
      ...rules,
      {
        id: Math.max(0, ...rules.map((rule) => rule.id)) + 1,
        column: first.column,
        operator: first.variant === "text" ? "contains" : "is",
        value: "",
      },
    ]);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Bộ lọc nâng cao${activeCount ? `, ${activeCount} điều kiện` : ""}`}
        >
          <Filter data-icon="inline-start" /> Bộ lọc{activeCount ? ` (${activeCount})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[70vh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto p-4">
        <PopoverHeader>
          <PopoverTitle>Bộ lọc nâng cao</PopoverTitle>
          <PopoverDescription>Lọc theo cột, điều kiện và giá trị.</PopoverDescription>
        </PopoverHeader>
        {rules.length > 1 && (
          <Field>
            <FieldLabel htmlFor="data-table-join-operator">Kết hợp điều kiện</FieldLabel>
            <Select value={joinOperator} onValueChange={(value) => onJoinOperatorChange(value as "and" | "or")}>
              <SelectTrigger id="data-table-join-operator" aria-label="Kết hợp điều kiện">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="and">Khớp tất cả</SelectItem>
                  <SelectItem value="or">Khớp bất kỳ</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}
        <FieldGroup className="gap-3">
          {rules.map((rule) => {
            const definition = definitions.find((item) => item.column === rule.column) ?? definitions[0];
            if (!definition) return null;
            return (
              <Field
                key={rule.id}
                className="grid gap-2 rounded-md border p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:items-end"
              >
                <Field>
                  <FieldLabel className="sr-only">Cột lọc</FieldLabel>
                  <Select
                    value={rule.column}
                    onValueChange={(column) => {
                      const next = definitions.find((item) => item.column === column);
                      updateRule(rule.id, {
                        column,
                        operator: next?.variant === "text" ? "contains" : "is",
                        value: "",
                      });
                    }}
                  >
                    <SelectTrigger aria-label="Cột lọc" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {definitions.map((item) => (
                          <SelectItem key={item.column} value={item.column}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel className="sr-only">Điều kiện lọc</FieldLabel>
                  <Select
                    value={rule.operator}
                    onValueChange={(operator) =>
                      updateRule(rule.id, {
                        operator,
                        value: operator === "isEmpty" || operator === "isNotEmpty" ? "" : rule.value,
                      })
                    }
                  >
                    <SelectTrigger aria-label="Điều kiện lọc" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {operators[definition.variant].map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel className="sr-only">Giá trị lọc</FieldLabel>
                  {rule.operator === "isEmpty" || rule.operator === "isNotEmpty" ? (
                    <Input aria-label="Giá trị lọc" disabled value="Không cần giá trị" readOnly />
                  ) : definition.variant === "select" ? (
                    <Select
                      value={rule.value || "__empty"}
                      onValueChange={(value) => updateRule(rule.id, { value: value === "__empty" ? "" : value })}
                    >
                      <SelectTrigger aria-label="Giá trị lọc" className="w-full">
                        <SelectValue placeholder="Chọn giá trị" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="__empty">Chọn giá trị</SelectItem>
                          {definition.options?.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      aria-label="Giá trị lọc"
                      type={definition.variant === "date" ? "date" : "text"}
                      value={rule.value}
                      onChange={(event) => updateRule(rule.id, { value: event.target.value })}
                      placeholder="Nhập giá trị"
                    />
                  )}
                </Field>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Xóa điều kiện"
                  onClick={() => onChange(rules.filter((item) => item.id !== rule.id))}
                >
                  <X />
                </Button>
              </Field>
            );
          })}
        </FieldGroup>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={addRule}>
            <Plus data-icon="inline-start" /> Thêm điều kiện
          </Button>
          {rules.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onChange([])}>
              Xóa tất cả
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
