"use client";

import { type FormEvent, useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { ReferralOrder } from "@/lib/affiliates/types";

type SyncedOrder = Pick<
  ReferralOrder,
  "databaseId" | "status" | "kiotvietOrderCode" | "kiotvietInvoiceCode" | "kiotvietStatus" | "completedAt"
>;

export function KiotVietOrderDialog({
  order,
  configured,
  onClose,
  onSynced,
}: {
  order: ReferralOrder | null;
  configured: boolean;
  onClose: () => void;
  onSynced: (order: SyncedOrder) => void;
}) {
  const [orderCode, setOrderCode] = useState("");
  const [invoiceCode, setInvoiceCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const details = order?.bookingDetails;

  useEffect(() => {
    setOrderCode(order?.kiotvietOrderCode ?? "");
    setInvoiceCode(order?.kiotvietInvoiceCode ?? "");
    setError("");
  }, [order]);

  async function sync(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/orders/kiotviet", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: order.databaseId, orderCode, invoiceCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không đối chiếu được KiotViet.");
      onSynced(data.order as SyncedOrder);
      toast.success("Đã đối chiếu trạng thái với KiotViet");
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không đối chiếu được KiotViet.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={Boolean(order)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chi tiết đơn đặt</DialogTitle>
          <DialogDescription>{order?.id}: dữ liệu được gửi trực tiếp từ biểu mẫu đặt giặt ủi.</DialogDescription>
        </DialogHeader>
        {order ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Khách hàng</dt>
            <dd className="text-right font-medium">{order.customer}</dd>
            <dt className="text-muted-foreground">Số điện thoại</dt>
            <dd className="text-right font-medium">{order.phone}</dd>
            <dt className="text-muted-foreground">Dịch vụ</dt>
            <dd className="text-right font-medium">
              {order.service}
              {details?.quantityKg ? ` · ${details.quantityKg} kg` : ""}
            </dd>
            <dt className="text-muted-foreground">Nhận đồ</dt>
            <dd className="text-right font-medium">
              {details?.pickupDate ? `${details.pickupDate} · ${details.pickupTime}` : "Chưa có"}
            </dd>
            <dt className="text-muted-foreground">Giao đồ</dt>
            <dd className="text-right font-medium">
              {details?.deliveryDate ? `${details.deliveryDate} · ${details.deliveryTime}` : "Chưa có"}
            </dd>
            <dt className="text-muted-foreground">Địa chỉ nhận</dt>
            <dd className="text-right font-medium">{order.address}</dd>
            <dt className="text-muted-foreground">Địa chỉ giao</dt>
            <dd className="text-right font-medium">{details?.deliveryAddress || order.address}</dd>
            <dt className="text-muted-foreground">Tạm tính</dt>
            <dd className="text-right font-medium">
              {order.orderAmount === null ? "Báo giá" : `${order.orderAmount.toLocaleString("vi-VN")}đ`}
            </dd>
            {details?.notes ? (
              <>
                <dt className="text-muted-foreground">Ghi chú</dt>
                <dd className="text-right font-medium">{details.notes}</dd>
              </>
            ) : null}
            {details?.coupon ? (
              <>
                <dt className="text-muted-foreground">Mã giảm giá</dt>
                <dd className="text-right font-medium">{details.coupon}</dd>
              </>
            ) : null}
          </dl>
        ) : null}
        <Separator />
        <div>
          <p className="font-medium text-sm">Đối chiếu KiotViet</p>
          <p className="text-muted-foreground text-sm">
            Liên kết mã KiotViet để cập nhật trạng thái xử lý thực tế của cửa hàng.
          </p>
        </div>
        <form onSubmit={sync} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="kiotviet-order-code">Mã đơn đặt hàng KiotViet</FieldLabel>
              <Input
                id="kiotviet-order-code"
                required
                maxLength={50}
                value={orderCode}
                onChange={(event) => setOrderCode(event.target.value.trim())}
                placeholder="Mã đơn trên KiotViet"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="kiotviet-invoice-code">Mã hóa đơn KiotViet (nếu đã có)</FieldLabel>
              <Input
                id="kiotviet-invoice-code"
                maxLength={50}
                value={invoiceCode}
                onChange={(event) => setInvoiceCode(event.target.value.trim())}
                placeholder="Để trống khi chưa xuất hóa đơn"
              />
            </Field>
          </FieldGroup>
          {!configured && (
            <p className="text-muted-foreground text-sm">
              Chưa có Retailer, Client ID và Client Secret trong cấu hình máy chủ. Hãy thêm trước khi đối chiếu.
            </p>
          )}
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button type="submit" disabled={!configured || saving}>
            {saving ? "Đang đối chiếu..." : "Liên kết và đồng bộ"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
