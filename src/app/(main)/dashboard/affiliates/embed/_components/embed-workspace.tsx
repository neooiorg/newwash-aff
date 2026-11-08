"use client";

import { useCallback, useEffect, useState } from "react";

import Image from "next/image";

import { Check, Copy, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";

import { AsciiPanelSkeleton } from "@/components/ascii-feedback";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock, CodeBlockContent, CodeBlockHeader, CodeBlockTitle } from "@/components/ui/code-block";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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

  const script = `<script async src="${origin}/embed.js"></script>`;
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
        description="Cấu hình website đích, mã nhúng và vị trí nút đặt lịch."
        actions={
          <Button variant="outline" size="sm" disabled={loading || !origin} onClick={() => setPreviewOpen(true)}>
            <Eye data-icon="inline-start" />
            Xem trước popup
          </Button>
        }
      />
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Không cập nhật được cấu hình</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-4">
          <Card className="order-1 xl:order-none">
            <CardHeader>
              <CardTitle>Website cửa hàng</CardTitle>
              <CardDescription>Mọi mã QR affiliate sẽ dẫn khách đến địa chỉ này.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="storefront-url">Địa chỉ website</FieldLabel>
                  {loading ? (
                    <AsciiPanelSkeleton className="h-9 w-full" height={28} rows={2} />
                  ) : (
                    <Input
                      id="storefront-url"
                      type="url"
                      value={storefrontUrl}
                      onChange={(event) => setStorefrontUrl(event.target.value)}
                      placeholder="https://giatui.vn/"
                    />
                  )}
                  <FieldDescription>Đổi địa chỉ sẽ cần tải lại những mã QR đã phát hành.</FieldDescription>
                </Field>
                <Button className="self-start" disabled={savingUrl || loading} onClick={saveUrl}>
                  {savingUrl ? "Đang lưu..." : "Lưu website"}
                </Button>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="order-3 min-w-0 xl:order-none">
            <CardHeader>
              <CardTitle>Mã nhúng</CardTitle>
              <CardDescription>Dán một lần vào website để hiển thị nút và popup đặt lịch.</CardDescription>
              <CardAction>
                <Button size="sm" variant="outline" onClick={copyScript} disabled={!origin}>
                  {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                  {copied ? "Đã sao chép" : "Sao chép"}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-3">
              {loading ? (
                <AsciiPanelSkeleton className="h-24 w-full" height={72} rows={4} />
              ) : origin ? (
                <CodeBlock size="sm">
                  <CodeBlockHeader>
                    <CodeBlockTitle>HTML</CodeBlockTitle>
                  </CodeBlockHeader>
                  <CodeBlockContent wrap>{script}</CodeBlockContent>
                </CodeBlock>
              ) : null}
              <p className="text-muted-foreground text-xs leading-relaxed">
                Khách đặt qua popup sẽ xuất hiện trong Đơn hàng. Admin cập nhật giá thực tế sau khi nhận đồ.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="order-2 min-w-0 self-start xl:order-none">
          <CardHeader>
            <CardTitle>Vị trí nút đặt lịch</CardTitle>
            <CardDescription>Khoảng cách từ mép phải và mép dưới của website, tính bằng pixel.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="relative h-48 overflow-hidden rounded-lg border bg-muted/40">
              <span className="text-muted-foreground absolute top-3 left-4 text-xs">Xem trước vị trí</span>
              <div
                className="absolute transition-[right,bottom] duration-200"
                style={{ right: `${embedOffsetX / 4}px`, bottom: `${embedOffsetY / 4}px` }}
              >
                <div className="flex items-center gap-2 rounded-full bg-yellow-400 py-1 pr-3 pl-1 text-xs font-semibold text-zinc-950 shadow-sm">
                  <Image alt="" aria-hidden="true" height={30} src="/laundry-icons/washer-lightning.png" width={30} />
                  Đặt lịch giặt ủi
                </div>
              </div>
            </div>
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="embed-offset-x">Cách mép phải</FieldLabel>
                  <div className="flex items-center gap-3">
                    <Slider
                      aria-label="Khoảng cách từ mép phải"
                      className="min-w-0 flex-1"
                      max={200}
                      min={0}
                      onValueChange={(value) => setEmbedOffsetX(value[0] ?? 0)}
                      step={1}
                      value={[embedOffsetX]}
                    />
                    <Input
                      id="embed-offset-x"
                      aria-label="Cách mép phải, pixel"
                      className="w-20 shrink-0 tabular-nums"
                      inputMode="numeric"
                      max={400}
                      min={0}
                      onChange={(event) => setEmbedOffsetX(Math.max(0, Math.min(400, Number(event.target.value))))}
                      type="number"
                      value={embedOffsetX}
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="embed-offset-y">Cách mép dưới</FieldLabel>
                  <div className="flex items-center gap-3">
                    <Slider
                      aria-label="Khoảng cách từ mép dưới"
                      className="min-w-0 flex-1"
                      max={200}
                      min={0}
                      onValueChange={(value) => setEmbedOffsetY(value[0] ?? 0)}
                      step={1}
                      value={[embedOffsetY]}
                    />
                    <Input
                      id="embed-offset-y"
                      aria-label="Cách mép dưới, pixel"
                      className="w-20 shrink-0 tabular-nums"
                      inputMode="numeric"
                      max={400}
                      min={0}
                      onChange={(event) => setEmbedOffsetY(Math.max(0, Math.min(400, Number(event.target.value))))}
                      type="number"
                      value={embedOffsetY}
                    />
                  </div>
                </Field>
              </div>
              <Button
                className="self-start"
                disabled={savingPosition || loading}
                onClick={saveButtonPosition}
                type="button"
                variant="outline"
              >
                {savingPosition ? "Đang lưu..." : "Lưu vị trí"}
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Xem trước popup trên website</DialogTitle>
            <DialogDescription>Kiểm tra trải nghiệm đặt lịch trước khi đưa mã nhúng lên website.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="embed-code">Mã affiliate dùng để xem thử</FieldLabel>
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
