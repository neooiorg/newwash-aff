"use client";

import { CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ApplicationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/affiliates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? "").trim(),
          contact: String(form.get("contact") ?? "").trim(),
          channel: String(form.get("channel") ?? "").trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không gửi được hồ sơ.");
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gửi được hồ sơ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-4 md:p-8">
      <Card className="mx-auto w-full max-w-xl">
        <CardHeader>
          <Image src="/newwash-logo.svg" alt="Newwash" width={160} height={60} className="h-auto w-36" unoptimized priority />
          <CardTitle className="pt-2 text-xl">Đăng ký cộng tác viên</CardTitle>
          <CardDescription>Gửi thông tin để NewWash xét duyệt. Mã affiliate và QR sẽ được cấp sau khi hồ sơ được duyệt.</CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="flex flex-col items-start gap-3 py-5">
              <CheckCircle2 className="text-primary size-8" />
              <h1 className="text-lg font-semibold">Đã gửi hồ sơ</h1>
              <p className="text-muted-foreground text-sm">Hồ sơ đang chờ xét duyệt. NewWash sẽ liên hệ qua thông tin bạn cung cấp.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-5">
              <FieldGroup>
                <Field><FieldLabel htmlFor="applicant-name">Họ và tên</FieldLabel><Input id="applicant-name" name="name" autoComplete="name" required maxLength={80} placeholder="Tên của bạn" /></Field>
                <Field><FieldLabel htmlFor="applicant-contact">Email hoặc số điện thoại</FieldLabel><Input id="applicant-contact" name="contact" required minLength={5} maxLength={100} placeholder="Thông tin liên hệ" /></Field>
                <Field><FieldLabel htmlFor="applicant-channel">Kênh giới thiệu</FieldLabel><Input id="applicant-channel" name="channel" maxLength={50} placeholder="Facebook, TikTok, website..." /></Field>
              </FieldGroup>
              {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
              <Button type="submit" size="lg" disabled={saving}>{saving ? "Đang gửi..." : "Gửi hồ sơ đăng ký"}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
