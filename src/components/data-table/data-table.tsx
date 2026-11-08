"use client";

import { type ReactNode, useState } from "react";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type RowData,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Search, Settings2 } from "lucide-react";

import {
  DataTableFilter,
  type DataTableFilterDefinition,
  type DataTableFilterRule,
  isActiveDataTableFilter,
  matchesDataTableFilter,
} from "@/components/data-table/data-table-filter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type DataTableFeatures, dataTableFeatures } from "@/lib/data-table-features";

export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData>;

interface DataTableProps<TData extends RowData> {
  data: TData[];
  columns: DataTableColumn<TData>[];
  getRowId: (row: TData) => string;
  searchColumn: string;
  searchPlaceholder: string;
  hideSearchColumn?: boolean;
  emptyMessage: string;
  selectedRowId?: string;
  initialSorting?: SortingState;
  initialColumnVisibility?: ColumnVisibilityState;
  filter?: { column: string; label: string; options: { value: string; label: string }[] };
  filters?: DataTableFilterDefinition<TData>[];
  toolbarEnd?: ReactNode;
}

/** Shared client-side tablecn-style table for the admin's full-list screens. */
export function DataTable<TData extends RowData>({
  data,
  columns,
  getRowId,
  searchColumn,
  searchPlaceholder,
  hideSearchColumn = true,
  emptyMessage,
  selectedRowId,
  initialSorting = [],
  initialColumnVisibility = {},
  filter,
  filters = [],
  toolbarEnd,
}: DataTableProps<TData>) {
  const [rules, setRules] = useState<DataTableFilterRule[]>([]);
  const [joinOperator, setJoinOperator] = useState<"and" | "or">("and");
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({
    ...initialColumnVisibility,
    ...(hideSearchColumn ? { [searchColumn]: false } : {}),
  });
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const activeRules = rules.filter(isActiveDataTableFilter);
  const filteredData = activeRules.length
    ? data.filter((row) =>
        joinOperator === "and"
          ? activeRules.every((rule) => matchesDataTableFilter(row, rule, filters))
          : activeRules.some((rule) => matchesDataTableFilter(row, rule, filters)),
      )
    : data;

  const table = useTable<DataTableFeatures, TData>({
    features: dataTableFeatures,
    data: filteredData,
    columns,
    getRowId,
    state: { sorting, columnFilters, columnVisibility, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  const search = (table.getColumn(searchColumn)?.getFilterValue() as string | undefined) ?? "";
  const filterValue = filter
    ? ((table.getColumn(filter.column)?.getFilterValue() as string | undefined) ?? "all")
    : "all";
  const pageCount = Math.max(1, table.getPageCount());

  return (
    <div data-slot="data-table" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:max-w-sm">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => {
              table.getColumn(searchColumn)?.setFilterValue(event.target.value || undefined);
              table.setPageIndex(0);
            }}
          />
        </InputGroup>
        {filter && (
          <Select
            value={filterValue}
            onValueChange={(value) => {
              table.getColumn(filter.column)?.setFilterValue(value === "all" ? undefined : value);
              table.setPageIndex(0);
            }}
          >
            <SelectTrigger aria-label={filter.label} size="sm">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Tất cả {filter.label.toLocaleLowerCase("vi")}</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
        {filters.length > 0 && (
          <DataTableFilter
            definitions={filters}
            rules={rules}
            onChange={(next) => {
              setRules(next);
              table.setPageIndex(0);
            }}
            joinOperator={joinOperator}
            onJoinOperatorChange={(next) => {
              setJoinOperator(next);
              table.setPageIndex(0);
            }}
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 data-icon="inline-start" /> Cột
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanHide() && (!hideSearchColumn || column.id !== searchColumn))
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(checked) => column.toggleVisibility(!!checked)}
                  >
                    {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {toolbarEnd}
      </div>

      {activeRules.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeRules.map((rule) => (
            <Button
              key={rule.id}
              variant="secondary"
              size="sm"
              onClick={() => setRules(rules.filter((item) => item.id !== rule.id))}
              aria-label={`Xóa lọc ${filters.find((item) => item.column === rule.column)?.label ?? rule.column}: ${rule.value || rule.operator}`}
            >
              {filters.find((item) => item.column === rule.column)?.label ?? rule.column}:{" "}
              {rule.value || (rule.operator === "isEmpty" ? "Để trống" : "Có giá trị")}
              <span aria-hidden="true">×</span>
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setRules([])}>
            Xóa lọc
          </Button>
        </div>
      )}

      <ScrollArea className="w-full rounded-lg border pb-2">
        <Table className="min-w-[720px]">
          <TableHeader className="bg-muted/30">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan} className="h-11 px-4">
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2"
                        onClick={() => header.column.toggleSorting(header.column.getIsSorted() === "asc")}
                        aria-label={`Sắp xếp theo ${typeof header.column.columnDef.header === "string" ? header.column.columnDef.header : header.column.id}`}
                      >
                        <table.FlexRender header={header} /> <ChevronsUpDown data-icon="inline-end" />
                      </Button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.id === selectedRowId ? "selected" : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length || 1}
                  className="h-28 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div data-slot="data-table-pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{table.getFilteredRowModel().rows.length} dòng</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Dòng mỗi trang</span>
          <Select value={String(pagination.pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
            <SelectTrigger size="sm" aria-label="Dòng mỗi trang">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectGroup>
                {[10, 20, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <span className="min-w-20 text-center">
            {Math.min(pagination.pageIndex + 1, pageCount)} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Trang trước"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Trang sau"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
