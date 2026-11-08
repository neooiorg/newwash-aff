"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { ArrowLeft, SquarePen } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderDetailSkeleton } from "@/components/workspace-skeletons";
import { useAffiliateRealtime } from "@/hooks/use-affiliate-realtime";
import type { ReferralOrder } from "@/lib/affiliates/types";

import { AffiliatePageHeader } from "../../../_components/affiliate-page-header";
import { OrderManagementDialog } from "../../_components/order-management-dialog";

function formatCurrency(value: number | null, fallback = "Chờ báo giá") {
  return value !== null ? `${value.toLocaleString("vi-VN")}đ` : fallback;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatSchedule(date?: string, time?: string) {
  if (!date) return "—";
  return time ? `${date} · ${time}` : date;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium sm:text-right">{value || "—"}</dd>
    </div>
  );
}

export function OrderDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<ReferralOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(() => {
    fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không tải được đơn hàng.");
        setOrder(data.order as ReferralOrder);
        setError("");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không tải được đơn hàng."))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useAffiliateRealtime(["newwash_orders"], refresh);

  if (loading) return <OrderDetailSkeleton />;

  if (!order) {
    return (
      <div className="flex flex-col gap-4">
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/dashboard/affiliates/orders">
            <ArrowLeft data-icon="inline-start" />
            Quay lại đơn hàng
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Không mở được đơn hàng</AlertTitle>
          <AlertDescription>{error || "Đơn hàng không tồn tại hoặc đã bị xóa."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const details = order.bookingDetails;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <AffiliatePageHeader
        title={order.id}
        description="Thông tin khách đặt, lịch nhận giao, giá thực tế và nguồn affiliate."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/affiliates/orders">
                <ArrowLeft data-icon="inline-start" />
                Quay lại
              </Link>
            </Button>
            <Button size="sm" onClick={() => setEditing(true)}>
              <SquarePen data-icon="inline-start" />
              Cập nhật trạng thái
            </Button>
          </div>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Dữ liệu realtime chưa cập nhật</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin đơn hàng</CardTitle>
            <CardDescription>Tạo ngày {order.createdAt}</CardDescription>
            <CardAction>
              <Badge variant={order.status === "Mới" ? "secondary" : "outline"}>{order.status}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Dịch vụ" value={order.service} />
              <DetailRow
                label="Khối lượng"
                value={details.quantityKg ? `${details.quantityKg.toLocaleString("vi-VN")} kg` : "Chờ cân"}
              />
              <DetailRow label="Giá thực tế" value={formatCurrency(order.orderAmount)} />
              <DetailRow
                label="Hoa hồng affiliate"
                value={
                  order.partnerCode
                    ? formatCurrency(order.affiliateCommissionAmount, "Chưa đặt hoa hồng")
                    : "Không có affiliate"
                }
              />
              <DetailRow label="Lịch nhận đồ" value={formatSchedule(details.pickupDate, details.pickupTime)} />
              <DetailRow label="Lịch giao đồ" value={formatSchedule(details.deliveryDate, details.deliveryTime)} />
              <DetailRow label="Địa chỉ nhận" value={order.address} />
              <DetailRow label="Địa chỉ giao" value={details.deliveryAddress ?? order.address} />
              <DetailRow label="Ghi chú" value={details.notes ?? "Không có ghi chú"} />
              <DetailRow label="Hoàn tất lúc" value={formatDate(order.completedAt)} />
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Khách hàng</CardTitle>
              <CardDescription>Thông tin liên hệ của người đặt.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl>
                <DetailRow label="Họ và tên" value={order.customer} />
                <DetailRow label="Số điện thoại" value={order.phone} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nguồn ghi nhận</CardTitle>
              <CardDescription>Thông tin quy thuộc đơn hàng.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl>
                <DetailRow
                  label="Mã affiliate"
                  value={order.partnerCode.length > 0 ? order.partnerCode : "Trực tiếp"}
                />
                <DetailRow label="Nguồn" value={order.source === "website" ? "Website" : "Demo cũ"} />
                <DetailRow label="Mã đơn website" value={order.externalOrderId ?? "—"} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <OrderManagementDialog
        order={editing ? order : null}
        onClose={() => setEditing(false)}
        onUpdated={(updated) => setOrder(updated)}
      />
    </div>
  );
}
