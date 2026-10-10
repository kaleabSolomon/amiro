import Link from "next/link";

// Links are absolute ("/#features", not "#features") because this footer also
// renders on the dashboard, profiles, and share pages, where a bare hash
// pointed at sections that don't exist on that page.
export function Footer() {
  return (
    <footer className="border-border/60 border-t py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center">
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-xl tracking-tight">Amiro</span>
          <span className="text-muted-foreground text-xs">
            © {new Date().getFullYear()}
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-6 text-muted-foreground text-sm">
          <Link href="/#features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="/#integrations" className="hover:text-foreground">
            Integrations
          </Link>
          <Link href="/#faq" className="hover:text-foreground">
            FAQ
          </Link>
          <Link href="/dashboard" className="hover:text-foreground">
            Open app
          </Link>
        </nav>
      </div>
    </footer>
  );
}
