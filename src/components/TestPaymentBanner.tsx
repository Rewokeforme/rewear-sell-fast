import { AlertTriangle } from "lucide-react";

export function TestPaymentBanner({
  variant = "buyer",
  className = "",
}: {
  variant?: "buyer" | "seller" | "checkout";
  className?: string;
}) {
  const text =
    variant === "seller"
      ? "Detta är en testbetalning. Skicka inte varan baserat på denna order — riktig betalning saknas ännu."
      : variant === "checkout"
        ? "Detta är en testkassa. Ingen riktig betalning genomförs."
        : "Testorder — ingen riktig betalning har genomförts.";
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
