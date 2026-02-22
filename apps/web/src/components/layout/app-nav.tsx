import Link from "next/link";

import UserMenu from "@/components/user-menu";

export function AppNav() {
  return (
    <nav className="border-b">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          Amiro
        </Link>
        <UserMenu />
      </div>
    </nav>
  );
}
