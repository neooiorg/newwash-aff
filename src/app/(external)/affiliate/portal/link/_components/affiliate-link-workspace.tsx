"use client";

import { useEffect, useRef, useState } from "react";

import { Copy, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { AffiliatePageHeader } from "@/app/(main)/dashboard/affiliates/_components/affiliate-page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { referralUrl } from "@/lib/affiliates/links";

export function AffiliateLinkWorkspace({ code, storefrontUrl }: { code: string; storefrontUrl: string }) {
  const [origin, setOrigin] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  const link = origin ? referralUrl(storefrontUrl, origin, code) : "";

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    toast.success("Đã sao chép link affiliate");
  }

  function downloadQr() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `newwash-${code}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <AffiliatePageHeader
        title="Link & QR của tôi"
        description="Chia sẻ đúng link hoặc mã QR này để đơn hàng được ghi nhận cho tài khoản của bạn."
      />
      {!storefrontUrl && (
        <Alert>
          <AlertTitle>Website đích chưa được cấu hình</AlertTitle>
          <AlertDescription>Vui lòng liên hệ quản trị viên trước khi chia sẻ QR.</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Link affiliate</CardTitle>
            <CardDescription>Mỗi lượt mở link này được ghi nhận vào thống kê của bạn.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={link} aria-label="Link affiliate" />
              <Button onClick={copyLink} disabled={!link}>
                <Copy data-icon="inline-start" />
                Sao chép
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-muted-foreground text-sm">Mã affiliate</span>
              <Badge variant="secondary">{code}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Mã QR</CardTitle>
            <CardDescription>Tải file SVG để in hoặc đăng lên mạng xã hội.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div ref={qrRef} className="rounded-xl border bg-white p-5">
              {link ? <QRCodeSVG value={link} size={220} title={`QR NewWash ${code}`} /> : null}
            </div>
            <Button variant="outline" onClick={downloadQr} disabled={!link}>
              <Download data-icon="inline-start" />
              Tải QR
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
