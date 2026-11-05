"use client";

import { useCallback, useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { Check, Copy, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock, CodeBlockContent, CodeBlockHeader, CodeBlockTitle } from "@/components/ui/code-block";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useAffiliateRealtime } from "@/hooks/use-affiliate-realtime";
import { referralUrl } from "@/lib/affiliates/links";
import type { Partner } from "@/lib/affiliates/types";

import { AffiliatePageHeader } from "../../_components/affiliate-page-header";

export function EmbedWorkspace() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [code, setCode] = useState("");
  const [storefrontUrl, setStorefrontUrl] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);
  const [savingPosition, setSavingPosition] = useState(false);
  const [embedOffsetX, setEmbedOffsetX] = useState(24);
  const [embedOffsetY, setEmbedOffsetY] = useState(24);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const refresh = useCallback(() => {
    Promise.all([fetch("/api/affiliates"), fetch("/api/affiliate-settings")])
      .then(async ([partnersResponse, settingsResponse]) => {
        const [partnersData, settingsData] = await Promise.all([partnersResponse.json(), settingsResponse.json()]);
        if (!partnersResponse.ok || !settingsResponse.ok)
          throw new Error(partnersData.error || settingsData.error || "Không tải được cấu hình.");
        const approved = (partnersData.partners as Partner[]).filter(
          (partner) => partner.status === "approved" && partner.code,
        );
        setPartners(approved);
        setCode((current) => current || approved[0]?.code || "");
        setStorefrontUrl(settingsData.storefrontUrl);
        setEmbedOffsetX(settingsData.embedOffsetX ?? 24);
        setEmbedOffsetY(settingsData.embedOffsetY ?? 24);
        setError("");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không tải được mã affiliate."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useAffiliateRealtime(["newwash_affiliates", "newwash_settings"], refresh);

  const script = `<script async src="${origin}/embed.js" data-order-endpoint="/api/newwash/orders"></script>`;
  const previewUrl = origin ? `${referralUrl("", origin, code)}&preview=1` : "";

  async function saveUrl() {
    setSavingUrl(true);
    setError("");
    try {
      const response = await fetch("/api/affiliate-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storefrontUrl, embedOffsetX, embedOffsetY }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không lưu được website.");
      setStorefrontUrl(data.storefrontUrl);
      toast.success("Đã lưu website đích cho mã QR");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được website.");
    } finally {
      setSavingUrl(false);
    }
  }

  async function saveButtonPosition() {
    setSavingPosition(true);
    setError("");
    try {
      const response = await fetch("/api/affiliate-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storefrontUrl, embedOffsetX, embedOffsetY }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không lưu được vị trí nút.");
      setEmbedOffsetX(data.embedOffsetX);
      setEmbedOffsetY(data.embedOffsetY);
      toast.success("Đã cập nhật vị trí nút đặt lịch");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được vị trí nút.");
    } finally {
      setSavingPosition(false);
    }
  }

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      toast.success("Đã sao chép script nhúng");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không sao chép được. Hãy chọn đoạn mã để sao chép thủ công.");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <AffiliatePageHeader
        title="Nhúng đặt đơn"
        description="Mọi QR mở website cửa hàng; popup chuyển yêu cầu đặt đơn cho chính website xử lý."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/affiliates/partners">Quản lý mã affiliate</Link>
          </Button>
        }
      />
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Không cập nhật được cấu hình</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="max-w-3xl">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Website và popup đặt đơn</CardTitle>
            <CardDescription>
              Nhúng script một lần trên website. Mỗi QR mang mã aff riêng tới cùng URL này và tự mở popup.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="storefront-url">URL website cửa hàng</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="storefront-url"
                    type="url"
                    className="min-w-56 flex-1"
                    value={storefrontUrl}
                    onChange={(event) => setStorefrontUrl(event.target.value)}
                    placeholder="https://giatui.example/"
                  />
                  <Button variant="outline" disabled={savingUrl || loading} onClick={saveUrl}>
                    {savingUrl ? "Đang lưu..." : "Lưu URL"}
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Chưa cấu hình sẽ chưa phát QR; nút Xem trước dùng website mẫu. Sau khi đổi URL, hãy tải lại các mã QR
                  đã phát hành.
                </p>
              </Field>
              <Field>
                <FieldLabel htmlFor="embed-code">Mã affiliate để xem thử QR</FieldLabel>
                <Input
                  id="embed-code"
                  list="affiliate-codes"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  maxLength={20}
                  placeholder="Chọn hoặc nhập mã affiliate"
                />
                <datalist id="affiliate-codes">
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.code ?? ""}>
                      {partner.name}
                    </option>
                  ))}
                </datalist>
              </Field>
              <Separator />
              <FieldSet>
                <FieldLegend>Vị trí nút đặt lịch</FieldLegend>
                <FieldDescription>
                  Điều chỉnh khoảng cách theo pixel tính từ mép phải và mép dưới của website.
                </FieldDescription>
                <FieldGroup className="grid gap-5 sm:grid-cols-2">
                  <Field>
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel htmlFor="embed-offset-x">Cách mép phải</FieldLabel>
                      <span className="text-sm font-medium tabular-nums">{embedOffsetX}px</span>
                    </div>
                    <Slider
                      aria-label="Khoảng cách từ mép phải"
                      max={200}
                      min={0}
                      onValueChange={(value) => setEmbedOffsetX(value[0] ?? 0)}
                      step={1}
                      value={[embedOffsetX]}
                    />
                    <Input
                      id="embed-offset-x"
                      inputMode="numeric"
                      max={400}
                      min={0}
                      onChange={(event) => setEmbedOffsetX(Math.max(0, Math.min(400, Number(event.target.value))))}
                      type="number"
                      value={embedOffsetX}
                    />
                  </Field>
                  <Field>
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel htmlFor="embed-offset-y">Cách mép dưới</FieldLabel>
                      <span className="text-sm font-medium tabular-nums">{embedOffsetY}px</span>
                    </div>
                    <Slider
                      aria-label="Khoảng cách từ mép dưới"
                      max={200}
                      min={0}
                      onValueChange={(value) => setEmbedOffsetY(value[0] ?? 0)}
                      step={1}
                      value={[embedOffsetY]}
                    />
                    <Input
                      id="embed-offset-y"
                      inputMode="numeric"
                      max={400}
                      min={0}
                      onChange={(event) => setEmbedOffsetY(Math.max(0, Math.min(400, Number(event.target.value))))}
                      type="number"
                      value={embedOffsetY}
                    />
                  </Field>
                </FieldGroup>
                <div className="relative h-72 overflow-hidden rounded-xl border bg-gradient-to-br from-background to-muted/60">
                  <div className="absolute inset-x-5 top-5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="size-2 rounded-full bg-border" />
                    Xem trước vị trí trên website
                  </div>
                  <div
                    className="absolute origin-bottom-right scale-75 transition-[right,bottom] duration-300 ease-out sm:scale-100"
                    style={{
                      right: `${Math.min(embedOffsetX, 96)}px`,
                      bottom: `${Math.min(embedOffsetY, 160)}px`,
                    }}
                  >
                    <Button
                      className="h-14 gap-2 rounded-full border border-yellow-500 bg-yellow-400 py-1.5 pr-4 pl-1.5 font-bold tracking-tight text-zinc-950 shadow-lg transition-transform duration-200 hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-xl active:translate-y-0 active:scale-[0.98]"
                      type="button"
                    >
                      <span className="grid size-10 place-items-center rounded-full bg-yellow-50 shadow-sm">
                        <Image
                          alt=""
                          aria-hidden="true"
                          height={36}
                          src="/laundry-icons/washer-lightning.png"
                          width={36}
                        />
                      </span>
                      Đặt lịch giặt ủi
                    </Button>
                  </div>
                </div>
                <Button
                  className="self-start"
                  disabled={savingPosition || loading}
                  onClick={saveButtonPosition}
                  type="button"
                  variant="outline"
                >
                  {savingPosition ? "Đang lưu..." : "Lưu vị trí nút"}
                </Button>
              </FieldSet>
            </FieldGroup>
            {loading ? (
              <Skeleton className="h-28 w-full" />
            ) : origin ? (
              <CodeBlock size="sm">
                <CodeBlockHeader>
                  <CodeBlockTitle>HTML</CodeBlockTitle>
                </CodeBlockHeader>
                <CodeBlockContent wrap>{script}</CodeBlockContent>
              </CodeBlock>
            ) : null}
            <p className="text-muted-foreground text-sm">
              Website cần nhận POST tại đường dẫn trong data-order-endpoint và trả về orderId. Backend website gửi sự
              kiện tạo đơn, hoàn thành về hệ thống aff; mã aff lấy từ QR được gửi cùng sự kiện tạo đơn.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={copyScript} disabled={!origin}>
                {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                {copied ? "Đã sao chép" : "Sao chép script"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button
        className="fixed right-6 bottom-6 rounded-full shadow-lg"
        size="lg"
        disabled={loading || !origin}
        onClick={() => setPreviewOpen(true)}
      >
        <Eye data-icon="inline-start" /> Xem trước
      </Button>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Xem trước popup trên website</DialogTitle>
            <DialogDescription>
              {code ? `Mô phỏng khách quét QR có mã ${code}.` : "Mô phỏng khách truy cập website và bấm nút đặt lịch."}
            </DialogDescription>
          </DialogHeader>
          {previewOpen && origin && (
            <iframe
              title="Xem trước biểu mẫu đặt đơn"
              src={previewUrl}
              className="bg-background h-[65vh] max-h-[600px] w-full rounded-lg border"
            />
          )}
          <Button asChild variant="outline" size="sm" className="justify-self-start">
            <a href={previewUrl} target="_blank" rel="noreferrer">
              Mở website mẫu <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
