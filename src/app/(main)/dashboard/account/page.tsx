import { auth } from "@/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { rootUser } from "@/data/users";

export const metadata = { title: "Tài khoản admin | NewWash Aff" };

export default async function Page() {
  const session = await auth();
  const user =
    session?.user.role === "admin"
      ? {
          name: session.user.name || rootUser.name,
          email: session.user.email || rootUser.email,
          image: session.user.image,
        }
      : { name: rootUser.name, email: rootUser.email, image: null };
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Tài khoản admin</h1>
        <p className="text-muted-foreground text-sm">Thông tin tài khoản đang đăng nhập vào NewWash Aff.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Avatar className="size-11 rounded-lg">
            {user.image ? <AvatarImage src={user.image} alt={user.name} referrerPolicy="no-referrer" /> : null}
            <AvatarFallback className="rounded-lg">{initials || "NW"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>Quản trị viên</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <Separator />
          <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
            <span className="text-muted-foreground">Vai trò</span>
            <div>
              <Badge variant="secondary">Admin</Badge>
            </div>
          </div>
          <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
            <span className="text-muted-foreground">Quyền truy cập</span>
            <span>Xem dashboard, quản lý cộng tác viên và đơn giới thiệu</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
