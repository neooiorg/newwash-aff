"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Mail, MoreHorizontal, RefreshCw, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";

import { AsciiPanelSkeleton } from "@/components/ascii-feedback";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import { AffiliatePageHeader } from "../../_components/affiliate-page-header";

type AdminMember = {
  id: string;
  email: string;
  name: string | null;
  status: "invited" | "active" | "revoked";
  invitedAt: string | null;
  acceptedAt: string | null;
  isPrimary: boolean;
};

const statusLabel: Record<AdminMember["status"], string> = {
  invited: "Đã gửi lời mời",
  active: "Đang hoạt động",
  revoked: "Đã thu hồi",
};

export function MembersWorkspace() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin-members");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được thành viên.");
      setMembers(data.members);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được thành viên.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin-members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không gửi được lời mời.");
      setMembers((current) => [data.member, ...current.filter((member) => member.id !== data.member.id)]);
      setInviteOpen(false);
      setName("");
      setEmail("");
      if (data.emailSent) toast.success(`Đã gửi lời mời đến ${data.member.email}`);
      else toast.warning(data.emailWarning || "Đã tạo lời mời nhưng email chưa gửi được.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gửi được lời mời.");
    } finally {
      setSubmitting(false);
    }
  }

  const columns = useMemo<DataTableColumn<AdminMember>[]>(
    () => [
      {
        id: "member",
        header: "Thành viên",
        accessorFn: (row) => `${row.name ?? ""} ${row.email}`,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{row.original.name || row.original.email.split("@")[0]}</span>
            <span className="text-muted-foreground text-xs">{row.original.email}</span>
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant={row.original.status === "active" ? "secondary" : "outline"}>
              {statusLabel[row.original.status]}
            </Badge>
            {row.original.isPrimary ? <Badge variant="outline">Chính</Badge> : null}
          </div>
        ),
      },
      {
        id: "invitedAt",
        accessorKey: "invitedAt",
        header: "Ngày mời",
        cell: ({ row }) =>
          row.original.invitedAt ? new Date(row.original.invitedAt).toLocaleDateString("vi-VN") : "—",
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) =>
          row.original.status === "invited" ? (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${row.original.email}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onSelect={() => {
                        setName(row.original.name || "");
                        setEmail(row.original.email);
                        setInviteOpen(true);
                      }}
                    >
                      <RefreshCw />
                      Gửi lại lời mời
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null,
      },
    ],
    [],
  );

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <AffiliatePageHeader
        title="Thành viên"
        description="Mời và theo dõi những người có quyền truy cập trang quản trị NewWash Aff."
        actions={
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserRoundPlus data-icon="inline-start" /> Mời thành viên
          </Button>
        }
      />

      {error ? <FieldError>{error}</FieldError> : null}
      {loading ? (
        <AsciiPanelSkeleton className="h-72 w-full" />
      ) : (
        <DataTable
          data={members}
          columns={columns}
          getRowId={(member) => member.id}
          searchColumn="member"
          searchPlaceholder="Tìm tên hoặc email thành viên"
          hideSearchColumn={false}
          emptyMessage="Chưa có thành viên quản trị."
        />
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mời thành viên quản trị</DialogTitle>
            <DialogDescription>
              Người nhận xác nhận qua email rồi đăng nhập bằng đúng tài khoản Google được mời.
            </DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-5" onSubmit={inviteMember}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="member-name">Tên hiển thị</FieldLabel>
                <Input
                  id="member-name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nguyễn Văn A"
                />
                <FieldDescription>Không bắt buộc.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="member-email">Email Google</FieldLabel>
                <Input
                  id="member-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="thanhvien@gmail.com"
                  required
                />
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner data-icon="inline-start" /> : <Mail data-icon="inline-start" />}
              Gửi lời mời
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
