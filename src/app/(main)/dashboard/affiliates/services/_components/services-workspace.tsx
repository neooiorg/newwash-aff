"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import Image from "next/image";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import type { DataTableFilterDefinition } from "@/components/data-table/data-table-filter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAffiliateRealtime } from "@/hooks/use-affiliate-realtime";
import type { BookingService } from "@/lib/booking-services";
import { getLaundryServiceIcon, laundryServiceIcons } from "@/lib/laundry-service-icons";

import { AffiliatePageHeader } from "../../_components/affiliate-page-header";

const blankService: BookingService = {
  id: "",
  code: "",
  category: "laundry",
  label: "",
  english: "",
  duration: "24 giờ",
  durationHours: 24,
  pricePerKg: null,
  minKg: 0,
  note: "",
  iconKey: "washer-lightning",
  active: true,
  sortOrder: 100,
};

const filters: DataTableFilterDefinition<BookingService>[] = [
  { column: "label", label: "Tên dịch vụ", variant: "text" },
  {
    column: "category",
    label: "Nhóm",
    variant: "select",
    options: [
      { value: "laundry", label: "Giặt sấy" },
      { value: "other", label: "Dịch vụ khác" },
    ],
  },
  {
    column: "active",
    label: "Trạng thái",
    variant: "select",
    options: [
      { value: "true", label: "Đang hiển thị" },
      { value: "false", label: "Đã ẩn" },
    ],
  },
  { column: "pricePerKg", label: "Giá mỗi kg", variant: "text" },
  { column: "durationHours", label: "Thời gian tối thiểu", variant: "text" },
];

const currency = new Intl.NumberFormat("vi-VN");

export function ServicesWorkspace() {
  const [services, setServices] = useState<BookingService[]>([]);
  const [whiteWashFee, setWhiteWashFee] = useState(0);
  const [feeDraft, setFeeDraft] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<BookingService | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/services", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được dịch vụ.");
      setServices(data.services);
      setWhiteWashFee(data.whiteWashFee);
      setFeeDraft(String(data.whiteWashFee));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được dịch vụ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useAffiliateRealtime(["newwash_services", "newwash_settings"], refresh);

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/services", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không lưu được dịch vụ.");
      setDraft(null);
      toast.success(draft.id ? "Đã cập nhật dịch vụ" : "Đã thêm dịch vụ");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được dịch vụ.");
    } finally {
      setSaving(false);
    }
  }

  async function setActive(item: BookingService, active: boolean) {
    setServices((current) => current.map((service) => (service.id === item.id ? { ...service, active } : service)));
    try {
      const response = await fetch("/api/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, active }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không đổi được trạng thái.");
      toast.success(active ? "Dịch vụ đã hiển thị trên form" : "Dịch vụ đã ẩn khỏi form");
    } catch (cause) {
      setServices((current) => current.map((service) => (service.id === item.id ? item : service)));
      setError(cause instanceof Error ? cause.message : "Không đổi được trạng thái.");
    }
  }

  async function saveFee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(feeDraft);
    if (!Number.isInteger(amount) || amount < 0) {
      setError("Phụ phí cần là số nguyên không âm.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whiteWashFee: amount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không lưu được phụ phí.");
      setWhiteWashFee(amount);
      setError("");
      toast.success("Đã cập nhật phụ phí giặt riêng đồ trắng");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được phụ phí.");
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<BookingService>[] = [
    {
      id: "label",
      accessorKey: "label",
      header: "Dịch vụ",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Image
            alt=""
            aria-hidden="true"
            className="size-10 shrink-0 object-contain"
            height={48}
            src={getLaundryServiceIcon(row.original.iconKey, row.original.code).src}
            width={48}
          />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{row.original.label}</span>
            <span className="text-xs text-muted-foreground">{row.original.english || row.original.code}</span>
          </div>
        </div>
      ),
    },
    {
      id: "category",
      accessorKey: "category",
      header: "Nhóm",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.category === "laundry" ? "Giặt sấy" : "Dịch vụ khác"}</Badge>
      ),
    },
    {
      id: "pricePerKg",
      accessorKey: "pricePerKg",
      header: "Giá / kg",
      cell: ({ row }) =>
        row.original.pricePerKg === null ? "Báo giá" : `${currency.format(row.original.pricePerKg)}đ`,
    },
    {
      id: "durationHours",
      accessorKey: "durationHours",
      header: "Thời gian",
      cell: ({ row }) => row.original.duration,
    },
    {
      id: "minKg",
      accessorKey: "minKg",
      header: "Tối thiểu",
      cell: ({ row }) => (row.original.pricePerKg === null ? "—" : `${row.original.minKg} kg`),
    },
    {
      id: "active",
      accessorFn: (row) => String(row.active),
      header: "Hiển thị",
      cell: ({ row }) => (
        <Switch
          checked={row.original.active}
          onCheckedChange={(checked) => void setActive(row.original, checked)}
          aria-label={`${row.original.active ? "Ẩn" : "Hiển thị"} dịch vụ ${row.original.label}`}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setDraft({ ...row.original })}>
          Sửa
        </Button>
      ),
    },
    { id: "search", accessorFn: (row) => `${row.label} ${row.english} ${row.code}`, header: "Tìm kiếm" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AffiliatePageHeader
        title="Quản lý dịch vụ"
        description="Quản lý dịch vụ, giá và thời gian hiển thị trong popup đặt đơn. Thay đổi tự cập nhật trên form đang mở."
        actions={
          <Button onClick={() => setDraft({ ...blankService, sortOrder: services.length * 10 + 10 })}>
            <Plus data-icon="inline-start" />
            Thêm dịch vụ
          </Button>
        }
      />
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Không thể cập nhật</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={saveFee} className="flex flex-wrap items-end gap-3 border-b pb-5">
        <Field className="max-w-xs">
          <FieldLabel htmlFor="white-wash-fee">Phụ phí giặt riêng đồ trắng (đ)</FieldLabel>
          <Input
            id="white-wash-fee"
            type="number"
            min="0"
            step="1"
            value={feeDraft}
            onChange={(event) => setFeeDraft(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="outline" disabled={saving || Number(feeDraft) === whiteWashFee}>
          Lưu phụ phí
        </Button>
      </form>
      {loading ? (
        <Skeleton className="h-80 w-full" />
      ) : (
        <DataTable
          data={services}
          columns={columns}
          getRowId={(item) => item.id}
          searchColumn="search"
          searchPlaceholder="Tìm tên dịch vụ"
          emptyMessage={services.length ? "Không có dịch vụ phù hợp." : "Chưa có dịch vụ nào."}
          filter={{
            column: "active",
            label: "Trạng thái",
            options: [
              { value: "true", label: "Đang hiển thị" },
              { value: "false", label: "Đã ẩn" },
            ],
          }}
          filters={filters}
        />
      )}
      <Dialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
      >
        <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Sửa dịch vụ" : "Thêm dịch vụ"}</DialogTitle>
            <DialogDescription>Thông tin này sẽ xuất hiện trong popup đặt đơn.</DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {draft && (
            <form id="service-form" onSubmit={saveService} className="min-h-0 overflow-x-hidden overflow-y-auto pr-1">
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="service-label">Tên dịch vụ *</FieldLabel>
                  <Input
                    id="service-label"
                    required
                    minLength={2}
                    maxLength={100}
                    value={draft.label}
                    onChange={(event) => setDraft({ ...draft, label: event.target.value })}
                    placeholder="Ví dụ: Giặt sấy tiêu chuẩn"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="service-english">Tên tiếng Anh</FieldLabel>
                  <Input
                    id="service-english"
                    maxLength={100}
                    value={draft.english}
                    onChange={(event) => setDraft({ ...draft, english: event.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="service-category">Nhóm dịch vụ</FieldLabel>
                    <NativeSelect
                      id="service-category"
                      className="w-full"
                      value={draft.category}
                      onChange={(event) =>
                        setDraft({ ...draft, category: event.target.value as BookingService["category"] })
                      }
                    >
                      <NativeSelectOption value="laundry">Giặt sấy</NativeSelectOption>
                      <NativeSelectOption value="other">Dịch vụ khác</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="service-order">Thứ tự hiển thị</FieldLabel>
                    <Input
                      id="service-order"
                      type="number"
                      min="0"
                      value={draft.sortOrder}
                      onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) })}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="service-price">Giá mỗi kg (đ)</FieldLabel>
                    <Input
                      id="service-price"
                      type="number"
                      min="0"
                      step="1"
                      value={draft.pricePerKg ?? ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          pricePerKg: event.target.value === "" ? null : Number(event.target.value),
                          minKg: event.target.value === "" ? draft.minKg : Math.max(1, draft.minKg),
                        })
                      }
                      placeholder="Để trống nếu báo giá"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="service-min-kg">Khối lượng tối thiểu (kg)</FieldLabel>
                    <Input
                      id="service-min-kg"
                      type="number"
                      min="0"
                      value={draft.minKg}
                      onChange={(event) => setDraft({ ...draft, minKg: Number(event.target.value) })}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="service-duration">Nhãn thời gian</FieldLabel>
                    <Input
                      id="service-duration"
                      required
                      value={draft.duration}
                      onChange={(event) => setDraft({ ...draft, duration: event.target.value })}
                      placeholder="Ví dụ: 4 giờ"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="service-hours">Giao sau tối thiểu (giờ)</FieldLabel>
                    <Input
                      id="service-hours"
                      type="number"
                      required
                      min="1"
                      max="720"
                      value={draft.durationHours}
                      onChange={(event) => setDraft({ ...draft, durationHours: Number(event.target.value) })}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Biểu tượng dịch vụ</FieldLabel>
                  <FieldDescription>Biểu tượng này xuất hiện cạnh dịch vụ trong popup đặt đơn.</FieldDescription>
                  <ToggleGroup
                    aria-label="Chọn biểu tượng dịch vụ"
                    className="grid grid-cols-3 gap-2 sm:grid-cols-5"
                    onValueChange={(value) => {
                      if (value) setDraft({ ...draft, iconKey: value });
                    }}
                    type="single"
                    value={draft.iconKey}
                    variant="outline"
                  >
                    {laundryServiceIcons.map((icon) => (
                      <ToggleGroupItem
                        aria-label={icon.label}
                        className="h-auto min-h-20 w-full flex-col gap-1.5 px-2 py-2 data-[state=on]:border-yellow-400 data-[state=on]:bg-yellow-50 data-[state=on]:text-zinc-950"
                        key={icon.key}
                        value={icon.key}
                      >
                        <Image alt="" aria-hidden="true" height={48} src={icon.src} width={48} />
                        <span className="line-clamp-1 text-[10px] text-muted-foreground">{icon.label}</span>
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
                <Field>
                  <FieldLabel htmlFor="service-note">Ghi chú trên form</FieldLabel>
                  <Textarea
                    id="service-note"
                    maxLength={300}
                    value={draft.note}
                    onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                    placeholder="Ví dụ: Chỉ áp dụng Quận 1, 3, 5"
                  />
                </Field>
                <Field orientation="horizontal" className="justify-between">
                  <div>
                    <FieldLabel htmlFor="service-active">Hiển thị trên form</FieldLabel>
                    <FieldDescription>Khách có thể chọn dịch vụ này.</FieldDescription>
                  </div>
                  <Switch
                    id="service-active"
                    checked={draft.active}
                    onCheckedChange={(checked) => setDraft({ ...draft, active: checked })}
                  />
                </Field>
              </FieldGroup>
            </form>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Hủy
            </Button>
            <Button type="submit" form="service-form" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu dịch vụ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
