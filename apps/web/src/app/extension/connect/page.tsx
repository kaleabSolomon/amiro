import { env } from "@amiro/env/web";
import Link from "next/link";

import { getToken } from "@/lib/auth-server";

export default async function ExtensionConnectPage() {
  const token = await getToken();

  if (!token) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-lg items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="font-semibold text-xl tracking-tight">
            Connect Chrome Extension
          </p>
          <p className="mt-2 text-muted-foreground text-sm">
            You need to sign in to connect your extension with your Amiro
            session.
          </p>
          <Link
            href="/auth?mode=signin"
            className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground text-sm"
          >
            Go to Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg items-center px-6 py-12">
      <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div
          id="amiro-extension-handshake"
          data-token={token}
          data-convex-site-url={env.NEXT_PUBLIC_CONVEX_SITE_URL}
          className="hidden"
        />
        <p className="font-semibold text-xl tracking-tight">
          Connecting extension...
        </p>
        <p
          id="amiro-extension-connect-status"
          className="mt-2 text-muted-foreground text-sm"
        >
          Waiting for extension handshake. This tab will close automatically
          when done.
        </p>
      </div>
    </main>
  );
}
