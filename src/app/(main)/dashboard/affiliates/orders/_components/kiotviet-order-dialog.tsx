"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
          <DialogTitle>Đối chiếu KiotViet</DialogTitle>
          <DialogDescription>
            {order?.externalOrderId || order?.id}: liên kết mã KiotViet để tham chiếu. Trạng thái affiliate được xác
            nhận bằng sự kiện từ website cửa hàng.
          </DialogDescription>
        </DialogHeader>
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
