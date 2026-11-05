"use client";

import { useCallback, useEffect, useState } from "react";

import { Check, CircleDollarSign, Clock3, WalletCards, X } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import type { DataTableFilterDefinition } from "@/components/data-table/data-table-filter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAffiliateRealtime } from "@/hooks/use-affiliate-realtime";

import { AffiliatePageHeader } from "../../_components/affiliate-page-header";

type Withdrawal = {
  id: string;
  affiliateId: string;
  affiliateName: string;
  affiliateCode: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  status: "pending" | "approved" | "paid" | "rejected";
  requestedAt: string;
};

const labels = { pending: "Chờ duyệt", approved: "Đã duyệt", paid: "Đã thanh toán", rejected: "Từ chối" };
const filters: DataTableFilterDefinition<Withdrawal>[] = [
  { column: "affiliateName", label: "Cộng tác viên", variant: "text" },
  {
    column: "status",
    label: "Trạng thái",
    variant: "select",
    options: Object.entries(labels).map(([value, label]) => ({ value, label })),
  },
  { column: "requestedAt", label: "Ngày yêu cầu", variant: "date" },
];

function vnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function statusVariant(status: Withdrawal["status"]): "destructive" | "secondary" | "outline" {
  if (status === "rejected") return "destructive";
  if (status === "paid") return "secondary";
  return "outline";
}

function successMessage(status: "approved" | "paid" | "rejected") {
  if (status === "paid") return "Đã xác nhận thanh toán";
  if (status === "approved") return "Đã duyệt yêu cầu";
  return "Đã từ chối yêu cầu";
}

export function PayoutsWorkspace() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    fetch("/api/affiliate-withdrawals", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không tải được yêu cầu rút tiền.");
        setItems(data.withdrawals);
        setError("");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không tải được yêu cầu rút tiền."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => refresh(), [refresh]);
  useAffiliateRealtime(["newwash_withdrawals"], refresh);

  async function update(item: Withdrawal, status: "approved" | "paid" | "rejected") {
    setProcessing(item.id);
    try {
      const response = await fetch("/api/affiliate-withdrawals", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id, status, note: "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không cập nhật được yêu cầu.");
      toast.success(successMessage(status));
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không cập nhật được yêu cầu.");
    } finally {
      setProcessing("");
    }
  }

  const columns: DataTableColumn<Withdrawal>[] = [
    {
      id: "affiliateName",
      accessorFn: (row) => `${row.affiliateName} ${row.affiliateCode}`,
      header: "Cộng tác viên",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.affiliateName}</span>
          <span className="text-muted-foreground text-xs">{row.original.affiliateCode}</span>
        </div>
      ),
    },
    {
      id: "amount",
      accessorKey: "amount",
      header: "Số tiền",
      cell: ({ row }) => <span className="font-medium tabular-nums">{vnd(row.original.amount)}</span>,
    },
    {
      id: "bank",
      accessorFn: (row) => `${row.bankName} ${row.accountNumber} ${row.accountHolder}`,
      header: "Tài khoản nhận",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>
            {row.original.bankName} · {row.original.accountNumber}
          </span>
          <span className="text-muted-foreground text-xs">{row.original.accountHolder}</span>
        </div>
      ),
    },
    {
      id: "requestedAt",
      accessorKey: "requestedAt",
      header: "Ngày yêu cầu",
      cell: ({ row }) => new Intl.DateTimeFormat("vi-VN").format(new Date(row.original.requestedAt)),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => <Badge variant={statusVariant(row.original.status)}>{labels[row.original.status]}</Badge>,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        if (row.original.status === "pending") {
          return (
            <div className="flex justify-end gap-1">
              <Button size="sm" disabled={Boolean(processing)} onClick={() => update(row.original, "approved")}>
                <Check data-icon="inline-start" />
                Duyệt
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={Boolean(processing)}
                onClick={() => update(row.original, "rejected")}
              >
                <X data-icon="inline-start" />
                Từ chối
              </Button>
            </div>
          );
        }
        if (row.original.status === "approved") {
          return (
            <Button size="sm" disabled={Boolean(processing)} onClick={() => update(row.original, "paid")}>
              <CircleDollarSign data-icon="inline-start" />
              Đã chuyển tiền
            </Button>
          );
        }
        return null;
      },
    },
  ];

  const pending = items.filter((item) => item.status === "pending");
  const approved = items.filter((item) => item.status === "approved");
  const paid = items.filter((item) => item.status === "paid");
  const metrics = [
    { label: "Chờ duyệt", value: vnd(pending.reduce((sum, item) => sum + item.amount, 0)), icon: Clock3 },
    { label: "Chờ chuyển tiền", value: vnd(approved.reduce((sum, item) => sum + item.amount, 0)), icon: WalletCards },
    { label: "Đã thanh toán", value: vnd(paid.reduce((sum, item) => sum + item.amount, 0)), icon: CircleDollarSign },
  ];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <AffiliatePageHeader
        title="Rút tiền"
        description="Duyệt yêu cầu và xác nhận thanh toán hoa hồng cho cộng tác viên."
      />
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Không thể xử lý</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <section className="grid gap-4 md:grid-cols-3" aria-label="Tổng quan rút tiền">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} size="sm">
              <CardHeader>
                <CardDescription>{metric.label}</CardDescription>
                <CardAction>
                  <Icon className="text-muted-foreground size-4" />
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-medium tabular-nums">{metric.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </section>
      {loading ? (
        <Skeleton className="h-80 w-full" />
      ) : (
        <DataTable
          data={items}
          columns={columns}
          getRowId={(item) => item.id}
          searchColumn="affiliateName"
          searchPlaceholder="Tìm cộng tác viên"
          emptyMessage="Chưa có yêu cầu rút tiền."
          filter={{
            column: "status",
            label: "Trạng thái",
            options: Object.entries(labels).map(([value, label]) => ({ value, label })),
          }}
          filters={filters}
        />
      )}
    </div>
  );
}
