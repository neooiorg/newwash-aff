"use client";

import { useActionState } from "react";

import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { loginAdmin } from "../actions";

export function AdminLoginForm({ demoEmail, demoPassword }: { demoEmail: string; demoPassword: string }) {
  const [error, action, pending] = useActionState(loginAdmin, "");

  return (
    <form action={action} className="flex flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email admin</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="username" required defaultValue={demoEmail} />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            defaultValue={demoPassword}
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
