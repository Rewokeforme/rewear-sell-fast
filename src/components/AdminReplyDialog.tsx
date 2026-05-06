import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Send, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_REPLIES = [
  "Tack för rapporten — vi har granskat och åtgärdat.",
  "Vi har granskat annonsen och den följer våra regler.",
  "Vi behöver mer information för att kunna gå vidare.",
  "Vi har varnat användaren.",
  "Annonsen har tagits bort.",
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: { reason: string; reporterName?: string | null } | null;
  onSubmit: (reply: string) => Promise<void> | void;
};

export function AdminReplyDialog({ open, onOpenChange, context, onSubmit }: Props) {
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setReply("");
      setSubmitting(false);
    }
  }, [open]);

  const canSubmit = reply.trim().length >= 4;

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(reply.trim());
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-border bg-card p-0 overflow-hidden">
        <div className="px-6 pt-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="font-display text-xl">Svara på rapport</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              Ditt svar skickas som ett meddelande från ReWoke-teamet till
              {context?.reporterName ? ` ${context.reporterName}` : " rapportören"} i deras inkorg.
            </DialogDescription>
          </DialogHeader>
        </div>

        {context?.reason && (
          <div className="mx-6 mt-4 rounded-xl border border-border bg-secondary/50 px-3 py-2.5">
            <p className="text-eyebrow mb-1 text-muted-foreground">Rapporterad anledning</p>
            <p className="text-sm text-foreground">{context.reason}</p>
          </div>
        )}

        <div className="space-y-4 px-6 pb-2 pt-4">
          <div>
            <p className="text-eyebrow mb-2 text-muted-foreground">Snabbsvar</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setReply(q)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    reply === q
                      ? "border-primary bg-primary text-primary-foreground shadow-soft"
                      : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-secondary",
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-eyebrow mb-2 block text-muted-foreground">Ditt svar</label>
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Skriv ett tydligt och vänligt svar…"
              rows={5}
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
            onClick={submit}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Skickar…" : "Skicka svar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
