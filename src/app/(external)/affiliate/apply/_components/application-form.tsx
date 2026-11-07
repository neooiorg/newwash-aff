"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";

import { CheckCircle2 } from "lucide-react";

import { PasswordInput } from "@/components/password-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ApplicationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("passwordConfirmation") ?? "");
    if (password !== confirmation) {
      setError("Mật khẩu xác nhận chưa trùng khớp.");
      return;
    }
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
          password,
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
    <div>
      {submitted ? (
        <div className="flex flex-col gap-5">
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Đã gửi hồ sơ</AlertTitle>
            <AlertDescription>
              Tài khoản đang chờ admin xét duyệt. Bạn có thể đăng nhập ngay sau khi hồ sơ được duyệt.
            </AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/auth/admin?mode=affiliate">Về trang đăng nhập</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="applicant-name">Họ và tên</FieldLabel>
              <Input
                id="applicant-name"
                name="name"
                autoComplete="name"
                required
                maxLength={80}
                placeholder="Nguyễn Minh Anh"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="applicant-contact">Tài khoản</FieldLabel>
              <Input
                id="applicant-contact"
                name="contact"
                autoComplete="username"
                required
                minLength={5}
                maxLength={100}
                placeholder="Email hoặc số điện thoại"
              />
              <FieldDescription>Tài khoản này sẽ dùng để đăng nhập sau khi được duyệt.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="applicant-channel">Kênh giới thiệu</FieldLabel>
              <Input id="applicant-channel" name="channel" maxLength={50} placeholder="Facebook, TikTok, website..." />
            </Field>
            <FieldGroup className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="applicant-password">Mật khẩu</FieldLabel>
                <PasswordInput
                  id="applicant-password"
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={64}
                  placeholder="Tối thiểu 8 ký tự"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="applicant-password-confirmation">Xác nhận mật khẩu</FieldLabel>
                <PasswordInput
                  id="applicant-password-confirmation"
                  name="passwordConfirmation"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={64}
                  placeholder="Nhập lại mật khẩu"
                />
              </Field>
            </FieldGroup>
          </FieldGroup>
          {error && <FieldError>{error}</FieldError>}
          <Button type="submit" disabled={saving}>
            {saving ? "Đang gửi hồ sơ..." : "Đăng ký cộng tác viên"}
          </Button>
          <FieldDescription className="text-center">
            Đã có tài khoản? <Link href="/auth/admin?mode=affiliate">Đăng nhập</Link>
          </FieldDescription>
        </form>
      )}
    </div>
  );
}
