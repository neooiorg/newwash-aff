"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Eye, MoreHorizontal, SquarePen } from "lucide-react";

import { AsciiPanelSkeleton } from "@/components/ascii-feedback";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import type { DataTableFilterDefinition } from "@/components/data-table/data-table-filter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAffiliateRealtime } from "@/hooks/use-affiliate-realtime";
import type { ReferralOrder } from "@/lib/affiliates/types";

import { AffiliatePageHeader } from "../../_components/affiliate-page-header";
import { OrderManagementDialog } from "./order-management-dialog";

const orderFilters: DataTableFilterDefinition<ReferralOrder>[] = [
  { column: "id", label: "Mã đơn", variant: "text" },
  { column: "externalOrderId", label: "Mã đơn website", variant: "text" },
  { column: "customer", label: "Khách hàng", variant: "text" },
  { column: "phone", label: "Số điện thoại", variant: "text" },
  { column: "service", label: "Dịch vụ", variant: "text" },
  { column: "address", label: "Địa chỉ", variant: "text" },
  { column: "partnerCode", label: "Mã aff", variant: "text" },
  {
    column: "source",
    label: "Nguồn",
    variant: "select",
    options: [
      { value: "website", label: "Website" },
      { value: "legacy", label: "Demo cũ" },
    ],
  },
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
  { column: "createdAt", label: "Ngày", variant: "date" },
];

export function OrdersWorkspace() {
  const [orders, setOrders] = useState<ReferralOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState("");

  const refresh = useCallback(() => {
    fetch("/api/orders", { cache: "no-store" })
      .then(async (ordersResponse) => {
        const ordersData = await ordersResponse.json();
        if (!ordersResponse.ok) throw new Error(ordersData.error || "Không tải được đơn.");
        setOrders(ordersData.orders);
        setError("");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không tải được đơn."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useAffiliateRealtime(["newwash_orders"], refresh);

  const websiteOrders = orders.filter((order) => order.source === "website");
  const newOrders = websiteOrders.filter((order) => order.status === "Mới").length;
  const completedOrders = websiteOrders.filter((order) => order.status === "Hoàn tất giao").length;
  const columns = useMemo<DataTableColumn<ReferralOrder>[]>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: "Mã ghi nhận",
        cell: ({ row }) => <span className="font-medium">{row.original.id}</span>,
      },
      {
        id: "externalOrderId",
        accessorKey: "externalOrderId",
        header: "Mã đơn website",
        cell: ({ row }) => row.original.externalOrderId || "—",
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
        id: "customer",
        accessorKey: "customer",
        header: "Khách hàng",
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{row.original.customer}</span>
            <span className="text-muted-foreground text-xs">{row.original.phone}</span>
          </div>
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
        id: "pickupSchedule",
        accessorFn: (row) => `${row.bookingDetails.pickupDate ?? ""} ${row.bookingDetails.pickupTime ?? ""}`,
        header: "Lịch nhận",
        cell: ({ row }) => {
          const { pickupDate, pickupTime } = row.original.bookingDetails;
          return pickupDate ? `${pickupDate}${pickupTime ? ` · ${pickupTime}` : ""}` : "—";
        },
      },
      {
        id: "source",
        accessorKey: "source",
        header: "Nguồn",
        cell: ({ row }) => (row.original.source === "website" ? "Website" : "Demo cũ"),
      },
      {
        id: "address",
        accessorKey: "address",
        header: "Địa chỉ",
        cell: ({ row }) => (
          <span title={row.original.address} className="block max-w-52 truncate">
            {row.original.address}
          </span>
        ),
      },
      {
        id: "orderAmount",
        accessorKey: "orderAmount",
        header: "Thực thu",
        cell: ({ row }) =>
          row.original.orderAmount ? (
            <span className="font-medium tabular-nums">{row.original.orderAmount.toLocaleString("vi-VN")}đ</span>
          ) : (
            <span className="text-muted-foreground">Chờ báo giá</span>
          ),
      },
      {
        id: "partnerCode",
        accessorKey: "partnerCode",
        header: "Mã aff",
        cell: ({ row }) =>
          row.original.partnerCode ? (
            <Badge variant="outline">{row.original.partnerCode}</Badge>
          ) : (
            <span className="text-muted-foreground">Trực tiếp</span>
          ),
      },
      { id: "createdAt", accessorKey: "createdAt", header: "Ngày" },
      {
        id: "search",
        accessorFn: (row) =>
          `${row.id} ${row.externalOrderId ?? ""} ${row.customer} ${row.phone} ${row.service} ${row.partnerCode}`,
        filterFn: "includesString",
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Thao tác đơn ${row.original.id}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/affiliates/orders/${row.original.databaseId}`}>
                    <Eye />
                    Xem chi tiết
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSelectedOrderId(row.original.databaseId)}>
                  <SquarePen />
                  Cập nhật trạng thái
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <AffiliatePageHeader
        title="Đơn hàng"
        description="Cân và kiểm tra đồ, nhập số tiền thực tế rồi hoàn tất giao để ghi nhận doanh thu và hoa hồng."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/affiliates/partners">Xem cộng tác viên</Link>
          </Button>
        }
      />
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Không tải được đơn đặt</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span>
            Đơn từ website <strong className="text-foreground ml-1 font-semibold">{websiteOrders.length}</strong>
          </span>
          <span>
            Đơn mới <strong className="text-foreground ml-1 font-semibold">{newOrders}</strong>
          </span>
          <span>
            Hoàn tất giao <strong className="text-foreground ml-1 font-semibold">{completedOrders}</strong>
          </span>
        </div>
      )}

      {loading ? (
        <AsciiPanelSkeleton className="h-80 w-full" />
      ) : (
        <DataTable
          data={orders}
          columns={columns}
          getRowId={(order) => order.id}
          searchColumn="search"
          searchPlaceholder="Tìm mã đơn, khách hoặc mã aff"
          emptyMessage={orders.length ? "Không có đơn phù hợp." : "Chưa có đơn đặt từ popup."}
          initialSorting={[{ id: "createdAt", desc: true }]}
          initialColumnVisibility={{
            externalOrderId: false,
            pickupSchedule: false,
            source: false,
            address: false,
          }}
          filters={orderFilters}
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
        />
      )}
      <OrderManagementDialog
        order={orders.find((order) => order.databaseId === selectedOrderId) ?? null}
        onClose={() => setSelectedOrderId("")}
        onUpdated={(updated) =>
          setOrders((current) => current.map((order) => (order.databaseId === updated.databaseId ? updated : order)))
        }
      />
    </div>
  );
}
