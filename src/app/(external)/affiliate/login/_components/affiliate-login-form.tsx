"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { loginAffiliate } from "../actions";

export function AffiliateLoginForm({
  defaultCode = "",
  defaultAccessKey = "",
}: {
  defaultCode?: string;
  defaultAccessKey?: string;
}) {
  const [error, action, pending] = useActionState(loginAffiliate, "");

  return (
    <form action={action} className="flex flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="affiliate-code">Mã affiliate</FieldLabel>
          <Input
            id="affiliate-code"
            name="code"
            autoComplete="username"
            required
            maxLength={20}
            defaultValue={defaultCode}
            placeholder="Ví dụ: NGUYENVANA"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="affiliate-access-key">Mã truy cập</FieldLabel>
          <Input
            id="affiliate-access-key"
            name="accessKey"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            maxLength={32}
            defaultValue={defaultAccessKey}
            placeholder="Mã do NewWash cấp"
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
