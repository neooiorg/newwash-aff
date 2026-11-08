"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

import { AffiliatePageHeader } from "@/app/(main)/dashboard/affiliates/_components/affiliate-page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WalletWorkspaceSkeleton } from "@/components/workspace-skeletons";
import { useAffiliateRealtime } from "@/hooks/use-affiliate-realtime";

type Withdrawal = {
  id: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  status: "pending" | "approved" | "paid" | "rejected";
  adminNote: string;
  requestedAt: string;
};

type Balance = { earned: number; available: number; processing: number; paid: number };

const statusLabel = { pending: "Chờ duyệt", approved: "Đã duyệt", paid: "Đã thanh toán", rejected: "Từ chối" };

function statusVariant(status: Withdrawal["status"]): "destructive" | "secondary" | "outline" {
  if (status === "rejected") return "destructive";
  if (status === "paid") return "secondary";
  return "outline";
}

function vnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

export function AffiliateWithdrawalsWorkspace() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    fetch("/api/affiliate-withdrawals", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không tải được dữ liệu rút tiền.");
        setWithdrawals(data.withdrawals);
        setBalance(data.balance);
        setError("");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu rút tiền."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => refresh(), [refresh]);
  useAffiliateRealtime(["newwash_orders", "newwash_withdrawals"], refresh, "affiliate");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/affiliate-withdrawals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: Number(form.get("amount")),
          bankName: String(form.get("bankName") ?? ""),
          accountNumber: String(form.get("accountNumber") ?? ""),
          accountHolder: String(form.get("accountHolder") ?? ""),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không gửi được yêu cầu rút tiền.");
      formElement.reset();
      toast.success("Đã gửi yêu cầu rút tiền");
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gửi được yêu cầu rút tiền.");
    } finally {
      setSaving(false);
    }
  }

  const processingCount = withdrawals.filter((item) => item.status === "pending" || item.status === "approved").length;
  const paidCount = withdrawals.filter((item) => item.status === "paid").length;
  const metrics = [
    {
      label: "Hoa hồng tích lũy",
      value: balance?.earned ?? 0,
      badge: "Tổng cộng",
      detail: "Hoa hồng từ các đơn đã hoàn tất",
    },
    {
      label: "Có thể rút",
      value: balance?.available ?? 0,
      badge: "Khả dụng",
      detail: "Số dư có thể tạo yêu cầu ngay",
    },
    {
      label: "Đang xử lý",
      value: balance?.processing ?? 0,
      badge: `${processingCount} yêu cầu`,
      detail: "Số dư đang chờ duyệt hoặc chuyển tiền",
    },
    {
      label: "Đã thanh toán",
      value: balance?.paid ?? 0,
      badge: `${paidCount} yêu cầu`,
      detail: "Tổng hoa hồng đã được chuyển",
    },
  ];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <AffiliatePageHeader title="Ví" description="Theo dõi hoa hồng và gửi yêu cầu chuyển khoản tới quản trị viên." />
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Không thể xử lý</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <WalletWorkspaceSkeleton />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Số dư hoa hồng">
            {metrics.map((metric) => (
              <Card key={metric.label}>
                <CardHeader>
                  <CardDescription>{metric.label}</CardDescription>
                  <CardAction>
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-3xl leading-none tracking-tight tabular-nums">{vnd(metric.value)}</span>
                    <Badge variant="outline">{metric.badge}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{metric.detail}</p>
                </CardContent>
              </Card>
            ))}
          </section>
          <div className="grid items-start gap-4 xl:grid-cols-12">
            <Card className="xl:col-span-4">
              <CardHeader>
                <CardTitle>Yêu cầu rút tiền</CardTitle>
                <CardDescription>Tối thiểu 10.000đ. Yêu cầu mới sẽ tạm giữ số dư tương ứng.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="flex flex-col gap-5">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="withdrawal-amount">Số tiền</FieldLabel>
                      <Input
                        id="withdrawal-amount"
                        name="amount"
                        type="number"
                        min="10000"
                        max={balance?.available}
                        step="1000"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="withdrawal-bank">Ngân hàng</FieldLabel>
                      <Input id="withdrawal-bank" name="bankName" placeholder="Ví dụ: Vietcombank" required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="withdrawal-account">Số tài khoản</FieldLabel>
                      <Input id="withdrawal-account" name="accountNumber" inputMode="numeric" required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="withdrawal-holder">Chủ tài khoản</FieldLabel>
                      <Input id="withdrawal-holder" name="accountHolder" placeholder="NGUYEN VAN A" required />
                    </Field>
                  </FieldGroup>
                  <Button type="submit" disabled={saving || !balance || balance.available < 10_000}>
                    {saving ? "Đang gửi..." : "Gửi yêu cầu"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            <Card className="xl:col-span-8">
              <CardHeader>
                <CardTitle>Lịch sử rút tiền</CardTitle>
                <CardDescription>Trạng thái được cập nhật ngay khi quản trị viên xử lý.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Ngân hàng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.length ? (
                      withdrawals.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{new Intl.DateTimeFormat("vi-VN").format(new Date(item.requestedAt))}</TableCell>
                          <TableCell className="font-medium tabular-nums">{vnd(item.amount)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{item.bankName}</span>
                              <span className="text-muted-foreground text-xs">{item.accountNumber}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(item.status)}>{statusLabel[item.status]}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                          Chưa có yêu cầu rút tiền.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
