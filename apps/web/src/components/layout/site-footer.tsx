import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-14">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <span className="font-serif text-xl tracking-tight">Amiro</span>

          <nav className="flex flex-wrap items-center gap-6 text-muted-foreground text-sm">
            <a href="#what" className="hover:text-foreground">
              What it does
            </a>
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <a href="#download" className="hover:text-foreground">
              Download
            </a>
            <Link href="/dashboard" className="hover:text-foreground">
              Open app
            </Link>
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-border/60 border-t pt-6 text-muted-foreground/70 text-xs md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} Amiro. Made with care.</span>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/" className="hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
