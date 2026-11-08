"use client";

import { useState } from "react";

import Link from "next/link";

import { CheckCircle2, MailCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function AcceptInvite({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "accepted" | "error">("idle");
  const [message, setMessage] = useState("");

  async function accept() {
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/admin-invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không xác nhận được lời mời.");
      setStatus("accepted");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Không xác nhận được lời mời.");
    }
  }

  if (status === "accepted") {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <CheckCircle2 className="text-primary size-12" />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-medium">Lời mời đã được xác nhận</h1>
          <p className="text-muted-foreground text-sm">
            Đăng nhập bằng đúng tài khoản Google nhận lời mời để vào trang quản trị.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/auth/admin">Đến trang đăng nhập</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <MailCheck className="text-primary size-12" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium">Xác nhận lời mời quản trị</h1>
        <p className="text-muted-foreground text-sm">
          Sau khi xác nhận, email được mời có thể đăng nhập NewWash Aff bằng Google.
        </p>
      </div>
      {status === "error" ? (
        <Alert variant="destructive" className="text-left">
          <AlertTitle>Không thể xác nhận</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <Button className="w-full" disabled={status === "loading" || !token} onClick={accept}>
        {status === "loading" ? <Spinner data-icon="inline-start" /> : null}
        Xác nhận lời mời
      </Button>
    </div>
  );
}
