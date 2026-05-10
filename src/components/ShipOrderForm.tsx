import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Truck, Upload } from "lucide-react";
import { updateOrderTracking, updateOrderStatus, type OrderRow } from "@/lib/orders";

const CARRIERS = ["PostNord", "DHL", "Schenker", "Bring", "Budbee", "Instabox", "Annan"];

export function ShipOrderForm({
  order,
  onShipped,
}: {
  order: Pick<OrderRow, "id" | "is_mock_payment" | "carrier" | "tracking_number">;
  onShipped: () => void | Promise<void>;
}) {
  const [carrier, setCarrier] = useState(order.carrier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? "");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const isMock = !!order.is_mock_payment;
  const canSubmit =
    carrier.trim().length > 0 && trackingNumber.trim().length > 0 && confirmed && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    const { error: tErr } = await updateOrderTracking(
      order.id,
      carrier.trim(),
      trackingNumber.trim(),
    );
    if (tErr) {
      toast.error(tErr);
      setBusy(false);
      return;
    }
    const { error } = await updateOrderStatus(order.id, "shipped");
    if (error) {
      toast.error(error);
      setBusy(false);
      return;
    }
    toast.success("Markerad som skickad");
    void note;
    await onShipped();
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-sm space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4" />
        <p className="font-medium">Skicka varan</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Skicka varan med valfri spårbar transportör. För att omfattas av ReWokes säljarskydd
        behöver du lägga in transportör och spårningsnummer innan ordern markeras som skickad.
      </p>

      {isMock && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Detta är en testbetalning. Skicka inte varan i verkligheten.</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium">Transportör</label>
        <select
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Välj transportör...</option>
          {CARRIERS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium">Spårningsnummer</label>
        <input
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Ex. 003707341234567890"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium">Kommentar (valfritt)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex. Inlämnat hos ombud"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5 opacity-60">
        <label className="block text-xs font-medium">Inlämningskvitto (kommer snart)</label>
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
          <Upload className="h-3.5 w-3.5" />
          Filuppladdning aktiveras inom kort
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>Jag bekräftar att varan är inlämnad hos transportör.</span>
      </label>

      <button
        disabled={!canSubmit}
        onClick={submit}
        className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isMock ? "Markera som skickad i testläge" : "Markera som skickad"}
      </button>

      <p className="text-[11px] text-muted-foreground">
        ReWoke är inte transportör och ansvarar inte för transportörens leverans, men använder
        spårningsinformation som underlag vid eventuell tvist.
      </p>
    </div>
  );
}
