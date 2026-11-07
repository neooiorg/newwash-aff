"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { Check, Copy, Download, KeyRound, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { AsciiPanelSkeleton } from "@/components/ascii-feedback";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import type { DataTableFilterDefinition } from "@/components/data-table/data-table-filter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAffiliateRealtime } from "@/hooks/use-affiliate-realtime";
import { referralUrl as buildReferralUrl } from "@/lib/affiliates/links";
import type { Partner } from "@/lib/affiliates/types";

import { AffiliatePageHeader } from "../../_components/affiliate-page-header";

const partnerFilters: DataTableFilterDefinition<Partner>[] = [
  { column: "name", label: "Cộng tác viên", variant: "text" },
  { column: "contact", label: "Liên hệ", variant: "text" },
  { column: "channel", label: "Kênh", variant: "text" },
  {
    column: "status",
    label: "Trạng thái",
    variant: "select",
    options: [
      { value: "pending", label: "Chờ duyệt" },
      { value: "approved", label: "Đã duyệt" },
      { value: "rejected", label: "Từ chối" },
    ],
  },
  { column: "code", label: "Mã affiliate", variant: "text" },
  { column: "createdAt", label: "Ngày tạo", variant: "date" },
];

const statusLabels: Record<Partner["status"], string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

export function PartnersWorkspace() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [storefrontUrl, setStorefrontUrl] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [credential, setCredential] = useState<{ name: string; code: string; accessKey: string } | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const refresh = useCallback(() => {
    Promise.all([fetch("/api/affiliates"), fetch("/api/affiliate-settings")])
      .then(async ([partnersResponse, settingsResponse]) => {
        const [partnersData, settingsData] = await Promise.all([partnersResponse.json(), settingsResponse.json()]);
        if (!partnersResponse.ok || !settingsResponse.ok)
          throw new Error(partnersData.error || settingsData.error || "Không tải được dữ liệu affiliate.");
        setPartners(partnersData.partners);
        setStorefrontUrl(settingsData.storefrontUrl);
        setError("");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không tải được cộng tác viên."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useAffiliateRealtime(["newwash_affiliates", "newwash_settings"], refresh);

  const selected = partners.find((partner) => partner.id === selectedId);
  const referralUrl =
    selected?.code && origin && storefrontUrl ? buildReferralUrl(storefrontUrl, origin, selected.code) : "";
  const sortedPartners = useMemo(
    () =>
      [...partners].sort((a, b) => {
        const rank = { pending: 0, approved: 1, rejected: 2 };
        return rank[a.status] - rank[b.status] || b.createdAt.localeCompare(a.createdAt);
      }),
    [partners],
  );
  const columns: DataTableColumn<Partner>[] = [
    {
      id: "name",
      accessorKey: "name",
      header: "Cộng tác viên",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-muted-foreground text-xs">{row.original.contact || "Chưa có liên hệ"}</span>
        </div>
      ),
    },
    { id: "channel", accessorKey: "channel", header: "Kênh", cell: ({ row }) => row.original.channel || "—" },
    {
      id: "status",
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "approved" ? "secondary" : "outline"}>
          {statusLabels[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "code",
      accessorKey: "code",
      header: "Mã affiliate",
      cell: ({ row }) =>
        row.original.code ? (
          <Badge variant="outline">{row.original.code}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { id: "createdAt", accessorKey: "createdAt", header: "Ngày đăng ký" },
    {
      id: "search",
      accessorFn: (row) => `${row.name} ${row.contact} ${row.code ?? ""} ${row.channel} ${statusLabels[row.status]}`,
      filterFn: "includesString",
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) =>
        row.original.status === "pending" ? (
          <div className="flex justify-end gap-1">
            <Button size="sm" disabled={Boolean(reviewingId)} onClick={() => reviewPartner(row.original, "approved")}>
              <Check data-icon="inline-start" /> Duyệt
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={Boolean(reviewingId)}
              onClick={() => reviewPartner(row.original, "rejected")}
            >
              <X data-icon="inline-start" /> Từ chối
            </Button>
          </div>
        ) : row.original.status === "approved" && row.original.code ? (
          <div className="flex justify-end gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/dashboard/affiliates?affiliate=${row.original.id}`}>Thống kê</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!storefrontUrl}
              title={!storefrontUrl ? "Cấu hình website đích trước khi tạo QR" : undefined}
              onClick={() => {
                setSelectedId(row.original.id);
                setQrOpen(true);
              }}
            >
              Xem QR
            </Button>
            <Button variant="ghost" size="sm" disabled={Boolean(reviewingId)} onClick={() => resetAccess(row.original)}>
              <KeyRound data-icon="inline-start" /> Mã vào
            </Button>
          </div>
        ) : null,
    },
  ];

  async function reviewPartner(partner: Partner, decision: "approved" | "rejected") {
    setReviewingId(partner.id);
    setError("");
    try {
      const response = await fetch("/api/affiliates", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: partner.id, decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không cập nhật được hồ sơ.");
      const updated = data.partner as Partner;
      setPartners((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (decision === "approved" && data.accessKey && updated.code) {
        setCredential({ name: updated.name, code: updated.code, accessKey: data.accessKey });
      }
      toast.success(decision === "approved" ? `Đã duyệt và cấp mã ${updated.code}` : `Đã từ chối ${updated.name}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không cập nhật được hồ sơ.");
    } finally {
      setReviewingId("");
    }
  }

  async function resetAccess(partner: Partner) {
    setReviewingId(partner.id);
    setError("");
    try {
      const response = await fetch("/api/affiliates", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: partner.id, decision: "reset_access" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không cấp lại được mã truy cập.");
      setCredential({ name: partner.name, code: partner.code ?? "", accessKey: data.accessKey });
      toast.success(`Đã cấp mã truy cập mới cho ${partner.name}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không cấp lại được mã truy cập.");
    } finally {
      setReviewingId("");
    }
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã sao chép ${label}`);
    } catch {
      toast.error("Không sao chép được. Hãy chọn và sao chép thủ công.");
    }
  }

  function downloadQr() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg || !selected?.code) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `newwash-${selected.code}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <AffiliatePageHeader
        title="Cộng tác viên"
        description="Duyệt hồ sơ đăng ký trước khi cấp mã affiliate và QR."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/affiliate/apply" target="_blank">
              Trang đăng ký
            </Link>
          </Button>
        }
      />
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Không cập nhật được hồ sơ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!loading && !storefrontUrl && (
        <Alert>
          <AlertTitle>Chưa cấu hình website đích</AlertTitle>
          <AlertDescription>
            <Link className="underline underline-offset-4" href="/dashboard/affiliates/embed">
              Cấu hình URL website
            </Link>{" "}
            để QR của mọi cộng tác viên dẫn về đúng nơi đặt đơn.
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <AsciiPanelSkeleton className="h-80 w-full" />
      ) : (
        <DataTable
          data={sortedPartners}
          columns={columns}
          getRowId={(partner) => partner.id}
          searchColumn="search"
          searchPlaceholder="Tìm tên, liên hệ hoặc mã affiliate"
          emptyMessage={partners.length ? "Không có cộng tác viên phù hợp." : "Chưa có hồ sơ đăng ký cộng tác viên."}
          selectedRowId={selected?.id}
          filter={{
            column: "status",
            label: "Trạng thái",
            options: [
              { value: "pending", label: "Chờ duyệt" },
              { value: "approved", label: "Đã duyệt" },
              { value: "rejected", label: "Từ chối" },
            ],
          }}
          filters={partnerFilters}
        />
      )}

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR dẫn về website cửa hàng</DialogTitle>
            <DialogDescription>
              {selected
                ? `Dành cho ${selected.name}. Khách quét QR sẽ mở website và popup đặt lịch.`
                : "Chọn cộng tác viên để xem QR."}
            </DialogDescription>
          </DialogHeader>
          {selected?.code && referralUrl && (
            <div className="flex flex-col gap-4">
              <div ref={qrRef} className="flex justify-center rounded-lg border bg-white p-5">
                <QRCodeSVG value={referralUrl} size={208} marginSize={0} title={`QR đặt đơn với mã ${selected.code}`} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">Mã affiliate</span>
                <Badge variant="secondary">{selected.code}</Badge>
              </div>
              <p className="text-muted-foreground text-xs break-all">{referralUrl}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => copy(referralUrl, "link")}>
                  <Copy data-icon="inline-start" /> Sao chép link
                </Button>
                <Button size="sm" variant="outline" onClick={downloadQr}>
                  <Download data-icon="inline-start" /> Tải QR
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/affiliate/login" target="_blank">
                    Trang đăng nhập
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(credential)} onOpenChange={(open) => !open && setCredential(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thông tin đăng nhập cộng tác viên</DialogTitle>
            <DialogDescription>
              Gửi riêng thông tin này cho {credential?.name}. Mã truy cập chỉ hiển thị trong lần cấp này.
            </DialogDescription>
          </DialogHeader>
          {credential && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-xs">Mã affiliate</span>
                <Input readOnly value={credential.code} />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-xs">Mã truy cập</span>
                <Input readOnly value={credential.accessKey} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => copy(`${credential.code}\n${credential.accessKey}`, "thông tin đăng nhập")}
                >
                  <Copy data-icon="inline-start" /> Sao chép thông tin
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/affiliate/login" target="_blank">
                    Mở trang đăng nhập
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
