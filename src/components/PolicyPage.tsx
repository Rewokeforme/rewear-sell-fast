import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

type Section = { title: string; body: React.ReactNode };

type Props = {
  eyebrow?: string;
  title: string;
  intro?: React.ReactNode;
  lastUpdated?: string;
  draftNotice?: boolean;
  sections: Section[];
};

export function PolicyPage({ eyebrow, title, intro, lastUpdated, draftNotice, sections }: Props) {
  return (
    <div className="min-h-screen bg-background pb-32 md:pb-16">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-14">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{title}</span>
        </nav>

        {/* Hero */}
        <header className="border-b border-border pb-8">
          {eyebrow && (
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-4xl md:text-5xl leading-tight tracking-tight">
            {title}
          </h1>
          {intro && (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {intro}
            </p>
          )}
          {lastUpdated && (
            <p className="mt-5 text-xs text-muted-foreground">
              Senast uppdaterad: <span className="text-foreground">{lastUpdated}</span>
            </p>
          )}
          {draftNotice && (
            <div className="mt-5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-foreground">
              <strong className="font-semibold">Observera:</strong> Detta är en preliminär version och ska juridiskt granskas före lansering.
            </div>
          )}
        </header>

        {/* Sections */}
        <div className="mt-10 space-y-10">
          {sections.map((s, i) => (
            <section key={s.title} className="scroll-mt-24" id={`section-${i + 1}`}>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-sm text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="font-display text-xl md:text-2xl">{s.title}</h2>
              </div>
              <div className="mt-3 ml-8 space-y-3 text-[15px] leading-relaxed text-foreground/90 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-primary [&_a]:underline">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-16 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Hittar du inte svar på din fråga?
          </p>
          <Link
            to="/contact"
            className="mt-2 inline-block font-medium text-primary hover:underline"
          >
            Kontakta oss →
          </Link>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
