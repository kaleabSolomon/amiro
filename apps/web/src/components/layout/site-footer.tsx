type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer className={className}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-6">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Amiro</p>
        <p className="text-sm text-muted-foreground">Personal Knowledge Mirror</p>
      </div>
    </footer>
  );
}
