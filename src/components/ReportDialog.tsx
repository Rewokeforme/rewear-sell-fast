import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Flag, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  /** Optional preset reasons shown as chips */
  presets?: string[];
  /** Submit handler — return a promise, dialog closes on resolve */
  onSubmit: (reason: string) => Promise<void> | void;
  submitLabel?: string;
};

const DEFAULT_PRESETS = [
  "Misstänkt bedrägeri",
  "Förfalskad vara",
  "Olämpligt innehåll",
  "Spam eller reklam",
  "Fel kategori",
  "Annat",
];

export function ReportDialog({
  open,
  onOpenChange,
  title = "Rapportera annons",
  description = "Hjälp oss hålla Rewear tryggt. Berätta kort vad som är fel — vårt team granskar alla rapporter.",
  presets = DEFAULT_PRESETS,
  onSubmit,
  submitLabel = "Skicka rapport",
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setDetails("");
      setSubmitting(false);
    }
  }, [open]);

  const reason = [selected, details.trim()].filter(Boolean).join(" — ");
  const canSubmit = Boolean(selected) || details.trim().length >= 4;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(reason || details.trim() || selected || "");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-border bg-card p-0 overflow-hidden">
        <div className="px-6 pt-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="font-display text-xl">{title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 pb-2 pt-5">
          <div>
            <p className="text-eyebrow mb-2 text-muted-foreground">Anledning</p>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => {
                const active = selected === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelected(active ? null : p)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-soft"
                        : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-secondary",
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-eyebrow mb-2 block text-muted-foreground">
              Beskriv kort (valfritt)
            </label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="T.ex. Säljaren ber mig betala via Swish utanför appen…"
              rows={4}
              className="resize-none rounded-xl border-border bg-background text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border bg-secondary/30 px-6 py-4 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
          >
            Avbryt
          </button>
          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Flag className="h-3.5 w-3.5" />
            {submitting ? "Skickar…" : submitLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
