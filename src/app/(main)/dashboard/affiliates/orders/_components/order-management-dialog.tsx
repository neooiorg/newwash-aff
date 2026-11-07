"use client";

import { type FormEvent, useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReferralOrder } from "@/lib/affiliates/types";

type OrderStatus = ReferralOrder["status"];

export function OrderManagementDialog({
  order,
  onClose,
  onUpdated,
}: {
  order: ReferralOrder | null;
  onClose: () => void;
  onUpdated: (order: ReferralOrder) => void;
}) {
  const [actualAmount, setActualAmount] = useState("");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [status, setStatus] = useState<OrderStatus>("Mới");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setActualAmount(order?.orderAmount ? String(order.orderAmount) : "");
    setCommissionAmount(
      order?.affiliateCommissionAmount !== null && order?.affiliateCommissionAmount !== undefined
        ? String(order.affiliateCommissionAmount)
        : "",
    );
    setStatus(order?.status ?? "Mới");
    setError("");
  }, [order]);

  async function updateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    const orderAmount = actualAmount ? Number(actualAmount) : null;
    const affiliateCommissionAmount = commissionAmount === "" ? null : Number(commissionAmount);
    if (status === "Hoàn tất giao" && (!orderAmount || orderAmount <= 0)) {
      setError("Vui lòng nhập số tiền thực tế trước khi hoàn tất giao.");
      return;
    }
    if (status === "Hoàn tất giao" && order.partnerCode && affiliateCommissionAmount === null) {
      setError("Vui lòng nhập hoa hồng affiliate trước khi hoàn tất giao.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: order.databaseId, orderAmount, affiliateCommissionAmount, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không cập nhật được đơn hàng.");
      onUpdated(data.order as ReferralOrder);
      toast.success(status === "Hoàn tất giao" ? "Đã ghi nhận giá trị đơn và hoa hồng" : "Đã cập nhật đơn hàng");
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không cập nhật được đơn hàng.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật đơn hàng</DialogTitle>
          <DialogDescription>
            {order ? `Đơn ${order.id}` : "Đơn hàng"}. Cập nhật giá trị, hoa hồng và trạng thái.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={updateOrder} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="actual-order-amount">Giá tiền thực tế</FieldLabel>
              <Input
                id="actual-order-amount"
                type="number"
                inputMode="numeric"
                min={1}
                max={1_000_000_000}
                value={actualAmount}
                onChange={(event) => setActualAmount(event.target.value)}
                placeholder="Nhập số tiền"
              />
            </Field>
            {order?.partnerCode ? (
              <Field>
                <FieldLabel htmlFor="affiliate-commission-amount">Hoa hồng affiliate</FieldLabel>
                <Input
                  id="affiliate-commission-amount"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1_000_000_000}
                  value={commissionAmount}
                  onChange={(event) => setCommissionAmount(event.target.value)}
                  placeholder="Nhập số tiền hoa hồng"
                />
                <FieldDescription>Mức hoa hồng thực tế của riêng đơn này.</FieldDescription>
              </Field>
            ) : null}
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
          {error ? <FieldError>{error}</FieldError> : null}
          <Button type="submit" disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu cập nhật"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
