"use client";

import Link from "next/link";
import { CircleUser, LogOut } from "lucide-react";

import { logoutAdmin } from "@/app/(main)/auth/admin/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountSwitcher({ users }: { readonly users: ReadonlyArray<{ readonly name: string; readonly email: string }> }) {
  const user = users[0];
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Tài khoản admin" className="rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
          <Avatar className="size-8 rounded-lg"><AvatarFallback>NW</AvatarFallback></Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <DropdownMenuLabel>
          <span className="block text-sm">{user.name}</span>
          <span className="text-muted-foreground block text-xs font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/dashboard/account"><CircleUser /> Tài khoản admin</Link></DropdownMenuItem>
        <form action={logoutAdmin}>
          <DropdownMenuItem asChild><button type="submit" className="w-full"><LogOut /> Đăng xuất</button></DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
