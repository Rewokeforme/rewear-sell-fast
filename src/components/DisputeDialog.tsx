import { useState } from "react";
import { toast } from "sonner";
import { X, Upload } from "lucide-react";
import {
  createDispute,
  uploadDisputeEvidence,
  DISPUTE_REASON_LABEL,
  type DisputeReason,
} from "@/lib/disputes";
import { updateOrderStatus, type OrderWithListing } from "@/lib/orders";

const REASONS: DisputeReason[] = [
  "item_not_received",
  "item_not_as_described",
  "damaged_item",
  "wrong_item",
  "suspected_fraud",
  "other",
];

export function DisputeDialog({
  order,
  userId,
  role,
  onClose,
  onCreated,
}: {
  order: OrderWithListing;
  userId: string;
  role: "buyer" | "seller";
  onClose: () => void;
  onCreated: () => void;
}) {
  const [reason, setReason] = useState<DisputeReason>("item_not_as_described");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const requiresImages =
    reason === "item_not_as_described" ||
    reason === "damaged_item" ||
    reason === "wrong_item";

  const trackingDelivered =
    reason === "item_not_received" &&
    (order.status === "delivered" || order.status === "completed");

  async function handleSubmit() {
    if (description.trim().length < 10) {
      toast.error("Beskriv problemet (minst 10 tecken)");
      return;
    }
    if (requiresImages && files.length === 0) {
      toast.error("Bifoga minst en bild");
      return;
    }
    setBusy(true);
    let uploaded: string[] = [];
    if (files.length > 0) {
      uploaded = await uploadDisputeEvidence(order.id, userId, files);
    }
    const evidenceForRole =
      role === "buyer"
        ? { buyerEvidenceUrls: uploaded }
        : { sellerEvidenceUrls: uploaded };

    const { error } = await createDispute({
      orderId: order.id,
      openedBy: userId,
      reason,
      description: description.trim(),
      ...evidenceForRole,
    });
    if (error) {
      toast.error(error);
      setBusy(false);
      return;
    }
    // Move order to disputed if currently in an active state
    if (["paid", "shipped", "delivered"].includes(order.status)) {
      await updateOrderStatus(order.id, "disputed");
    }
    toast.success("Tvisten har skickats in. ReWoke granskar ärendet.");
    setBusy(false);
    onCreated();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg">Öppna tvist</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Anledning
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as DisputeReason)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm mb-3"
        >
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {DISPUTE_REASON_LABEL[r]}
            </option>
          ))}
        </select>

        {trackingDelivered && (
          <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs">
            Transportören visar att paketet är levererat. ReWoke kommer granska
            ärendet innan eventuell återbetalning.
          </div>
        )}

        {reason === "item_not_as_described" && (
          <p className="mb-3 text-xs text-muted-foreground">
            Återbetalning kräver normalt att varan returneras till säljaren.
          </p>
        )}

        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Beskrivning
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Beskriv vad som hänt så detaljerat som möjligt..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm mb-3"
        />

        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Bilder {requiresImages && <span className="text-destructive">*</span>}
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-3 text-sm cursor-pointer mb-2">
          <Upload className="h-4 w-4" />
          <span className="text-muted-foreground">
            {files.length > 0 ? `${files.length} fil(er) valda` : "Välj bilder"}
          </span>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>

        <p className="text-xs text-muted-foreground mb-4">
          Vid godkänd retur återbetalas köparen normalt först när varan har returnerats
          eller när ReWoke har fattat beslut i ärendet.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-border px-5 py-2.5 text-sm font-medium"
          >
            Avbryt
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="flex-1 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Skickar..." : "Skicka tvist"}
          </button>
        </div>
      </div>
    </div>
  );
}
