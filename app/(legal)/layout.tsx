import Link from "next/link";

/** Shared chrome for the public legal pages (privacy, terms). */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-2xl px-6 py-5">
        <Link href="/" className="text-lg font-bold text-primary">
          CourtVision
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-8 prose-sm">{children}</main>
    </div>
  );
}
