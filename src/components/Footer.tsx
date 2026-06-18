import { Link } from "@tanstack/react-router";
import { Instagram, Linkedin } from "lucide-react";

type LinkItem = { label: string; to: string };

const columns: { heading: string; links: LinkItem[] }[] = [
  {
    heading: "ReWoke",
    links: [
      { label: "Om ReWoke", to: "/contact" },
      { label: "Så fungerar det", to: "/buyer-guide" },
      { label: "Hållbarhet", to: "/safety" },
      { label: "Säker handel", to: "/safety" },
    ],
  },
  {
    heading: "För användare",
    links: [
      { label: "Hjälpcenter", to: "/contact" },
      { label: "Säljarguide", to: "/seller-guide" },
      { label: "Köparguide", to: "/buyer-guide" },
      { label: "Frakt & leverans", to: "/shipping" },
      { label: "Betalning", to: "/shipping" },
    ],
  },
  {
    heading: "Trygghet",
    links: [
      { label: "Verifierade säljare", to: "/safety" },
      { label: "Rapportera annons", to: "/safety" },
      { label: "Rapportera användare", to: "/safety" },
      { label: "Säkerhetsråd", to: "/safety" },
      { label: "Communityregler", to: "/community-guidelines" },
    ],
  },
  {
    heading: "Juridiskt",
    links: [
      { label: "Användarvillkor", to: "/terms" },
      { label: "Integritetspolicy", to: "/privacy" },
      { label: "Cookiepolicy", to: "/cookies" },
      { label: "Regler för annonser", to: "/ad-rules" },
      { label: "Säljarvillkor", to: "/terms" },
      { label: "Köparvillkor", to: "/terms" },
      { label: "Dataskydd / GDPR", to: "/privacy" },
    ],
  },
];

// TikTok icon (lucide doesn't ship it consistently)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.5 5.5a4.5 4.5 0 0 0 4 2.25v3.06a7.55 7.55 0 0 1-4-1.18v6.62a5.85 5.85 0 1 1-5.85-5.85c.3 0 .6.02.9.07v3.18a2.7 2.7 0 1 0 1.95 2.6V2.5h3v3z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-background pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
        {/* Brand row */}
        <div className="mb-12 flex flex-col items-start gap-5 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md">
            <Link to="/" className="inline-flex items-baseline gap-1.5">
              <span className="font-display text-3xl tracking-tight text-foreground">ReWoke</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">SE</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Premium svensk second hand för kläder, skor och accessoarer.
              Sälj på 60 sekunder. Spara CO₂. Bär vidare.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <p className="text-eyebrow text-muted-foreground">Följ oss</p>
            <div className="flex items-center gap-2">
              <SocialLink href="https://instagram.com" label="Instagram">
                <Instagram className="h-4 w-4" />
              </SocialLink>
              <SocialLink href="https://tiktok.com" label="TikTok">
                <TikTokIcon className="h-4 w-4" />
              </SocialLink>
              <SocialLink href="https://linkedin.com" label="LinkedIn">
                <Linkedin className="h-4 w-4" />
              </SocialLink>
            </div>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-y-10 gap-x-6 md:grid-cols-4 md:gap-x-10">
          {columns.map((col) => (
            <div key={col.heading}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal bottom row */}
        <div className="mt-14 border-t border-border pt-8">
          <div className="flex flex-col gap-4 text-xs text-muted-foreground md:flex-row md:items-start md:justify-between">
            <div className="space-y-1.5">
              <p className="text-foreground">© 2026 ReWoke. Alla rättigheter förbehållna.</p>
              <p>ReWoke är en svensk second hand-plattform för kläder, skor och accessoarer.</p>
            </div>
            <div className="md:text-right">
              <p className="text-eyebrow text-muted-foreground">Kontakt</p>
              <a href="mailto:support@rewoke.se" className="mt-1 block text-sm text-foreground hover:text-primary">
                support@rewoke.se
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:border-primary/40 hover:bg-primary hover:text-primary-foreground"
    >
      {children}
    </a>
  );
}
