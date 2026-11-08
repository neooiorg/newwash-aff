import { NewWashAuthShell } from "@/components/newwash-auth-shell";

import { AcceptInvite } from "./_components/accept-invite";

export const metadata = { title: "Lời mời quản trị | NewWash Aff" };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;

  return (
    <NewWashAuthShell>
      <div className="mx-auto w-full max-w-[420px]">
        <AcceptInvite token={token} />
      </div>
    </NewWashAuthShell>
  );
}
