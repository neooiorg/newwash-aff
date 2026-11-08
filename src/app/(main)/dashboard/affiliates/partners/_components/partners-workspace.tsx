"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { BarChart3, Check, Copy, Download, Eye, LockKeyhole, MoreHorizontal, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { AsciiPanelSkeleton } from "@/components/ascii-feedback";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import type { DataTableFilterDefinition } from "@/components/data-table/data-table-filter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      { value: "locked", label: "Đã khóa" },
    ],
  },
  { column: "code", label: "Mã affiliate", variant: "text" },
  { column: "createdAt", label: "Ngày tạo", variant: "date" },
];

const statusLabels: Record<Partner["status"], string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  locked: "Đã khóa",
};

export function PartnersWorkspace() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [storefrontUrl, setStorefrontUrl] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [partnerToLock, setPartnerToLock] = useState<Partner | null>(null);
  const [credential, setCredential] = useState<{ name: string; account: string; password: string } | null>(null);
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
        const rank = { pending: 0, approved: 1, locked: 2, rejected: 3 };
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
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${row.original.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                {(row.original.status === "approved" || row.original.status === "locked") && (
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/affiliates?affiliate=${row.original.id}`}>
                      <BarChart3 />
                      Xem thống kê
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onSelect={() => {
                    setSelectedId(row.original.id);
                    setDetailOpen(true);
                  }}
                >
                  <Eye />
                  Xem chi tiết
                </DropdownMenuItem>
              </DropdownMenuGroup>
              {row.original.status === "pending" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      disabled={Boolean(reviewingId)}
                      onSelect={() => reviewPartner(row.original, "approved")}
                    >
                      <Check />
                      Duyệt hồ sơ
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={Boolean(reviewingId)}
                      onSelect={() => reviewPartner(row.original, "rejected")}
                    >
                      <X />
                      Từ chối hồ sơ
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
              {row.original.status === "approved" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={Boolean(reviewingId)}
                      onSelect={() => setPartnerToLock(row.original)}
                    >
                      <LockKeyhole />
                      Khóa tài khoản
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
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
        setCredential({ name: updated.name, account: updated.contact, password: data.accessKey });
      }
      toast.success(decision === "approved" ? `Đã duyệt và cấp mã ${updated.code}` : `Đã từ chối ${updated.name}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không cập nhật được hồ sơ.");
    } finally {
      setReviewingId("");
    }
  }

  async function lockPartner(partner: Partner) {
    setReviewingId(partner.id);
    setError("");
    try {
      const response = await fetch("/api/affiliates", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: partner.id, decision: "locked" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không khóa được tài khoản.");
      const updated = data.partner as Partner;
      setPartners((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setPartnerToLock(null);
      toast.success(`Đã khóa tài khoản ${partner.name}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không khóa được tài khoản.");
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
              { value: "locked", label: "Đã khóa" },
            ],
          }}
          filters={partnerFilters}
        />
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết cộng tác viên</DialogTitle>
            <DialogDescription>Thông tin tài khoản, trạng thái và QR giới thiệu của cộng tác viên.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Họ tên</dt>
                  <dd className="font-medium">{selected.name}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Trạng thái</dt>
                  <dd>
                    <Badge variant={selected.status === "approved" ? "secondary" : "outline"}>
                      {statusLabels[selected.status]}
                    </Badge>
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Tài khoản</dt>
                  <dd>{selected.contact}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Kênh</dt>
                  <dd>{selected.channel || "—"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Mã affiliate</dt>
                  <dd>{selected.code ? <Badge variant="outline">{selected.code}</Badge> : "—"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Ngày đăng ký</dt>
                  <dd>{selected.createdAt}</dd>
                </div>
              </dl>
              {selected.code && referralUrl && (
                <div className="flex flex-col gap-3">
                  <div ref={qrRef} className="flex justify-center rounded-lg border bg-white p-5">
                    <QRCodeSVG
                      value={referralUrl}
                      size={208}
                      marginSize={0}
                      title={`QR đặt đơn với mã ${selected.code}`}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs break-all">{referralUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => copy(referralUrl, "link")}>
                      <Copy data-icon="inline-start" /> Sao chép link
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadQr}>
                      <Download data-icon="inline-start" /> Tải QR
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(partnerToLock)} onOpenChange={(open) => !open && setPartnerToLock(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khóa tài khoản affiliate?</AlertDialogTitle>
            <AlertDialogDescription>
              {partnerToLock?.name} sẽ không thể đăng nhập hoặc ghi nhận lượt nhấp và đơn hàng mới. Dữ liệu lịch sử vẫn
              được giữ nguyên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!partnerToLock || Boolean(reviewingId)}
              onClick={() => partnerToLock && lockPartner(partnerToLock)}
            >
              Khóa tài khoản
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(credential)} onOpenChange={(open) => !open && setCredential(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thông tin đăng nhập cộng tác viên</DialogTitle>
            <DialogDescription>
              Gửi riêng thông tin này cho {credential?.name}. Mật khẩu chỉ hiển thị trong lần cấp này.
            </DialogDescription>
          </DialogHeader>
          {credential && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-xs">Tài khoản</span>
                <Input readOnly value={credential.account} />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-xs">Mật khẩu</span>
                <Input readOnly value={credential.password} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => copy(`${credential.account}\n${credential.password}`, "thông tin đăng nhập")}
                >
                  <Copy data-icon="inline-start" /> Sao chép thông tin
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/auth/admin?mode=affiliate" target="_blank">
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
