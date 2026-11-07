"use client";

import { useActionState } from "react";

import Link from "next/link";

import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { loginAffiliate } from "../affiliate-actions";

export function AffiliateLoginForm({
  defaultAccount = "",
  defaultPassword = "",
}: {
  defaultAccount?: string;
  defaultPassword?: string;
}) {
  const [error, action, pending] = useActionState(loginAffiliate, "");

  return (
    <form action={action} className="flex flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="affiliate-account">Tài khoản</FieldLabel>
          <Input
            id="affiliate-account"
            name="account"
            autoComplete="username"
            required
            maxLength={100}
            defaultValue={defaultAccount}
            placeholder="Email hoặc số điện thoại"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="affiliate-password">Mật khẩu</FieldLabel>
          <PasswordInput
            id="affiliate-password"
            name="password"
            autoComplete="current-password"
            required
            minLength={8}
            maxLength={64}
            defaultValue={defaultPassword}
            placeholder="Nhập mật khẩu"
          />
        </Field>
      </FieldGroup>
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" disabled={pending}>
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>
      <FieldDescription className="text-center">
        Chưa có tài khoản? <Link href="/affiliate/apply">Đăng ký cộng tác viên</Link>
      </FieldDescription>
    </form>
  );
}
