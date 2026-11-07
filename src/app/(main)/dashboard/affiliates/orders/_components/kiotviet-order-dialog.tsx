"use client";

import { type FormEvent, useEffect, useState } from "react";

import { CircleAlert } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { ReferralOrder } from "@/lib/affiliates/types";

type OrderStatus = ReferralOrder["status"];

export function KiotVietOrderDialog({
  order,
  configured,
  onClose,
  onSynced,
}: {
  order: ReferralOrder | null;
  configured: boolean;
  onClose: () => void;
  onSynced: (order: ReferralOrder) => void;
}) {
  const [actualAmount, setActualAmount] = useState("");
  const [status, setStatus] = useState<OrderStatus>("Mới");
  const [orderCode, setOrderCode] = useState("");
  const [invoiceCode, setInvoiceCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const details = order?.bookingDetails;

  useEffect(() => {
    setActualAmount(order?.orderAmount ? String(order.orderAmount) : "");
    setStatus(order?.status ?? "Mới");
    setOrderCode(order?.kiotvietOrderCode ?? "");
    setInvoiceCode(order?.kiotvietInvoiceCode ?? "");
    setError("");
  }, [order]);

  async function updateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    const orderAmount = actualAmount ? Number(actualAmount) : null;
    if (status === "Hoàn tất giao" && (!orderAmount || orderAmount <= 0)) {
      setError("Vui lòng nhập số tiền thực tế trước khi hoàn tất giao.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: order.databaseId, orderAmount, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không cập nhật được đơn hàng.");
      onSynced(data.order as ReferralOrder);
      toast.success(status === "Hoàn tất giao" ? "Đã ghi nhận doanh thu và hoa hồng" : "Đã cập nhật đơn hàng");
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không cập nhật được đơn hàng.");
    } finally {
      setSaving(false);
    }
  }

  async function syncKiotViet() {
    if (!order) return;
    setSyncing(true);
    setError("");
    try {
      const response = await fetch("/api/orders/kiotviet", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: order.databaseId, orderCode, invoiceCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không đối chiếu được KiotViet.");
      onSynced({ ...order, ...data.order });
      toast.success("Đã đối chiếu trạng thái với KiotViet");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không đối chiếu được KiotViet.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[min(90dvh,48rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Cập nhật đơn hàng</DialogTitle>
          <DialogDescription>{order?.id}: cân đồ, kiểm tra tình trạng rồi nhập số tiền thực tế.</DialogDescription>
        </DialogHeader>
        {order ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Khách hàng</dt>
            <dd className="text-right font-medium">
              {order.customer} · {order.phone}
            </dd>
            <dt className="text-muted-foreground">Dịch vụ</dt>
            <dd className="text-right font-medium">{order.service}</dd>
            <dt className="text-muted-foreground">Địa chỉ nhận</dt>
            <dd className="text-right font-medium">{order.address}</dd>
            <dt className="text-muted-foreground">Địa chỉ giao</dt>
            <dd className="text-right font-medium">{details?.deliveryAddress ?? order.address}</dd>
            <dt className="text-muted-foreground">Khách tạm tính</dt>
            <dd className="text-right font-medium">
              {details?.estimatedTotal ? `${details.estimatedTotal.toLocaleString("vi-VN")}đ` : "Chờ cân và báo giá"}
            </dd>
          </dl>
        ) : null}

        {!order?.orderAmount ? (
          <Alert>
            <CircleAlert />
            <AlertTitle>Chưa ghi nhận doanh thu</AlertTitle>
            <AlertDescription>
              Hoa hồng chỉ được tính khi có giá thực tế và trạng thái “Hoàn tất giao”.
            </AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={updateOrder} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="actual-order-amount">Số tiền thực tế</FieldLabel>
              <Input
                id="actual-order-amount"
                type="number"
                inputMode="numeric"
                min={1}
                max={1_000_000_000}
                value={actualAmount}
                onChange={(event) => setActualAmount(event.target.value)}
                placeholder="Nhập sau khi cân và kiểm tra đồ"
              />
              <FieldDescription>Đây là số tiền dùng để tính doanh thu và hoa hồng affiliate.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="order-status">Trạng thái</FieldLabel>
              <Select value={status} onValueChange={(value) => setStatus(value as OrderStatus)}>
                <SelectTrigger id="order-status" className="w-full">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="Mới">Mới</SelectItem>
                    <SelectItem value="Đang xử lý">Đang xử lý</SelectItem>
                    <SelectItem value="Hoàn tất giao">Hoàn tất giao</SelectItem>
                    <SelectItem value="Đã hủy">Đã hủy</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu cập nhật"}
          </Button>
        </form>

        <Separator />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm">Đối chiếu KiotViet</p>
          <p className="text-muted-foreground text-sm">Tùy chọn, chỉ dùng khi cửa hàng đã có thông tin kết nối.</p>
        </div>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="kiotviet-order-code">Mã đơn KiotViet</FieldLabel>
            <Input
              id="kiotviet-order-code"
              maxLength={50}
              value={orderCode}
              onChange={(event) => setOrderCode(event.target.value.trim())}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="kiotviet-invoice-code">Mã hóa đơn KiotViet</FieldLabel>
            <Input
              id="kiotviet-invoice-code"
              maxLength={50}
              value={invoiceCode}
              onChange={(event) => setInvoiceCode(event.target.value.trim())}
            />
          </Field>
        </FieldGroup>
        <Button type="button" variant="outline" disabled={!configured || syncing || !orderCode} onClick={syncKiotViet}>
          {syncing ? "Đang đối chiếu..." : "Đối chiếu KiotViet"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
