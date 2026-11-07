"use client";

import { cn } from "cn";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function GoogleButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn("w-full", className)}
      onClick={() => signIn("google", { redirectTo: "/auth/google/complete" })}
      {...props}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
        <path
          fill="#4285F4"
          d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.01v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.4Z"
        />
        <path
          fill="#34A853"
          d="M12 22c2.7 0 4.98-.9 6.64-2.42l-3.25-2.53c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z"
        />
        <path fill="#FBBC05" d="M6.39 13.88a6 6 0 0 1 0-3.76V7.51H3.04a10 10 0 0 0 0 8.98l3.35-2.61Z" />
        <path
          fill="#EA4335"
          d="M12 5.99c1.47 0 2.79.5 3.83 1.5l2.88-2.88A9.66 9.66 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.61C7.18 7.75 9.39 5.99 12 5.99Z"
        />
      </svg>
      Tiếp tục với Google
    </Button>
  );
}
