"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { loginAffiliate } from "../actions";

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
          <Input
            id="affiliate-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            maxLength={32}
            defaultValue={defaultPassword}
            placeholder="Nhập mật khẩu"
          />
        </Field>
      </FieldGroup>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>
    </form>
  );
}
