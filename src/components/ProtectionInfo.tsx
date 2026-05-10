import { ShieldCheck, Package, Inbox } from "lucide-react";

export function ProtectionSummary() {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-lg mb-3">
        <ShieldCheck className="h-4 w-4" />
        ReWoke köpar- och säljarskydd
      </h2>
      <ul className="text-sm text-muted-foreground space-y-1.5">
        <li>• När betalning aktiveras hanteras betalningen via ReWoke enligt våra villkor</li>
        <li>• Spårbar frakt krävs för fullt leveransskydd</li>
        <li>• Vid problem granskas bevis från köpare, säljare och transportör</li>
        <li>• Återbetalning sker inte automatiskt utan tvistgranskning</li>
      </ul>
    </section>
  );
}

export function SellerProtection() {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-sm">
      <h3 className="flex items-center gap-2 font-medium mb-2">
        <Package className="h-4 w-4" /> Säljarskydd
      </h3>
      <ul className="text-muted-foreground space-y-1.5">
        <li>• Använd alltid spårbar frakt</li>
        <li>• Spara kvitto/inlämningsbevis</li>
        <li>• Markera ordern som skickad först när paketet är inlämnat</li>
        <li>• Vid leveransbekräftelse från transportör räknas ordern normalt som levererad</li>
      </ul>
    </section>
  );
}

export function BuyerProtection() {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-sm">
      <h3 className="flex items-center gap-2 font-medium mb-2">
        <Inbox className="h-4 w-4" /> Köparskydd
      </h3>
      <ul className="text-muted-foreground space-y-1.5">
        <li>• Kontrollera plagget när det kommer fram</li>
        <li>• Rapportera problem inom 48 timmar efter leverans</li>
        <li>• Bifoga bilder om varan inte stämmer med beskrivningen</li>
        <li>• Vid godkänd tvist kan återbetalning ske enligt ReWokes villkor</li>
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Vid godkänd retur återbetalas köparen normalt först när varan har returnerats
        eller när ReWoke har fattat beslut i ärendet.
      </p>
    </section>
  );
}
