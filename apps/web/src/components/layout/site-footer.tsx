type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer
      className={className}
      style={{ backgroundColor: "var(--landing-panel)" }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-6">
        <p className="text-muted-foreground text-sm">
          © {new Date().getFullYear()} Amiro
        </p>
        <p className="text-muted-foreground text-sm">
          Personal Knowledge Mirror
        </p>
      </div>
    </footer>
  );
}
