import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Mail, Send, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Kontakt — ReWoke" },
      { name: "description", content: "Hör av dig till ReWokes support — vi finns här för dig." },
      { property: "og:title", content: "Kontakt — ReWoke" },
      { property: "og:description", content: "Kontakta ReWoke support." },
    ],
  }),
  component: ContactPage,
});

const issueTypes = [
  "Konto",
  "Annons",
  "Betalning",
  "Rapportering",
  "Teknisk fråga",
  "Juridiskt/dataskydd",
] as const;

function ContactPage() {
  const [issue, setIssue] = useState<string>(issueTypes[0]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      toast.error("Fyll i e-post och meddelande.");
      return;
    }
    setSending(true);
    // Placeholder: log + toast. Wire to backend when contact endpoint is ready.
    setTimeout(() => {
      setSending(false);
      setMessage("");
      toast.success("Tack! Vi återkommer så snart vi kan.");
    }, 700);
  }

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-16">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-14">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Kontakt</span>
        </nav>

        <header className="border-b border-border pb-8">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Support</p>
          <h1 className="font-display text-4xl md:text-5xl leading-tight tracking-tight">Kontakta oss</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Vi finns här om något krånglar, om du har feedback eller om du vill rapportera något.
            Vanligtvis svarar vi inom ett dygn.
          </p>
        </header>

        <div className="mt-10 grid gap-8 md:grid-cols-[1fr,1.4fr]">
          {/* Contact card */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </span>
              <p className="mt-3 text-eyebrow text-muted-foreground">Mejla oss direkt</p>
              <a href="mailto:support@rewoke.se" className="mt-1 block font-display text-lg text-foreground hover:underline">
                support@rewoke.se
              </a>
            </div>
          </aside>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div>
              <label className="text-eyebrow text-muted-foreground" htmlFor="issue">Ärendetyp</label>
              <select
                id="issue"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
              >
                {issueTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-eyebrow text-muted-foreground" htmlFor="email">Din e-post</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="namn@exempel.se"
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
              />
            </div>
            <div>
              <label className="text-eyebrow text-muted-foreground" htmlFor="message">Meddelande</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Beskriv ditt ärende så detaljerat du kan…"
                className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-soft transition hover:bg-primary/90 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {sending ? "Skickar…" : "Skicka meddelande"}
            </button>
          </form>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
