"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AffiliatePageHeader } from "@/app/(main)/dashboard/affiliates/_components/affiliate-page-header";
import { AsciiPanelSkeleton } from "@/components/ascii-feedback";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import type { DataTableFilterDefinition } from "@/components/data-table/data-table-filter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAffiliateRealtime } from "@/hooks/use-affiliate-realtime";
import type { ReferralOrder } from "@/lib/affiliates/types";

const filters: DataTableFilterDefinition<ReferralOrder>[] = [
  { column: "id", label: "Mã đơn", variant: "text" },
  { column: "service", label: "Dịch vụ", variant: "text" },
  {
    column: "status",
    label: "Trạng thái",
    variant: "select",
    options: [
      { value: "Mới", label: "Mới" },
      { value: "Đang xử lý", label: "Đang xử lý" },
      { value: "Hoàn tất giao", label: "Hoàn tất giao" },
      { value: "Đã hủy", label: "Đã hủy" },
    ],
  },
  { column: "createdAt", label: "Ngày ghi nhận", variant: "date" },
];

function currency(value: number | null, fallback: string) {
  return value !== null ? `${value.toLocaleString("vi-VN")}đ` : fallback;
}

export function AffiliateOrdersWorkspace() {
  const [orders, setOrders] = useState<ReferralOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    fetch("/api/affiliate-orders", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không tải được đơn hàng.");
        setOrders(data.orders as ReferralOrder[]);
        setError("");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không tải được đơn hàng."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useAffiliateRealtime(["newwash_orders"], refresh, "affiliate");

  const columns = useMemo<DataTableColumn<ReferralOrder>[]>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: "Mã đơn",
        cell: ({ row }) => <span className="font-medium">{row.original.id}</span>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Trạng thái",
        filterFn: "equalsString",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "Mới" ? "secondary" : "outline"}>{row.original.status}</Badge>
        ),
      },
      {
        id: "service",
        accessorKey: "service",
        header: "Dịch vụ",
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span>{row.original.service}</span>
            {row.original.bookingDetails.quantityKg ? (
              <span className="text-muted-foreground text-xs">{row.original.bookingDetails.quantityKg} kg</span>
            ) : null}
          </div>
        ),
      },
      {
        id: "customer",
        accessorKey: "customer",
        header: "Khách hàng",
        cell: ({ row }) => row.original.customer,
      },
      {
        id: "orderAmount",
        accessorKey: "orderAmount",
        header: "Giá trị đơn",
        cell: ({ row }) => <span className="tabular-nums">{currency(row.original.orderAmount, "Chờ báo giá")}</span>,
      },
      {
        id: "affiliateCommissionAmount",
        accessorKey: "affiliateCommissionAmount",
        header: "Hoa hồng",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {currency(
              row.original.affiliateCommissionAmount,
              row.original.status === "Hoàn tất giao" ? "Chờ xác nhận" : "Chưa ghi nhận",
            )}
          </span>
        ),
      },
      { id: "createdAt", accessorKey: "createdAt", header: "Ngày ghi nhận" },
      {
        id: "search",
        accessorFn: (row) => `${row.id} ${row.customer} ${row.service} ${row.status}`,
        filterFn: "includesString",
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [],
  );

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <AffiliatePageHeader
        title="Đơn hàng của tôi"
        description="Theo dõi đơn phát sinh, giá trị thực tế, trạng thái và hoa hồng được ghi nhận."
      />
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Không tải được đơn hàng</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {loading ? (
        <AsciiPanelSkeleton className="h-80 w-full" />
      ) : (
        <DataTable
          data={orders}
          columns={columns}
          getRowId={(order) => order.databaseId}
          searchColumn="search"
          searchPlaceholder="Tìm mã đơn, khách hoặc dịch vụ"
          emptyMessage="Chưa có đơn nào được ghi nhận cho tài khoản của bạn."
          initialSorting={[{ id: "createdAt", desc: true }]}
          filter={{
            column: "status",
            label: "Trạng thái",
            options: [
              { value: "Mới", label: "Mới" },
              { value: "Đang xử lý", label: "Đang xử lý" },
              { value: "Hoàn tất giao", label: "Hoàn tất giao" },
              { value: "Đã hủy", label: "Đã hủy" },
            ],
          }}
          filters={filters}
        />
      )}
    </div>
  );
}
