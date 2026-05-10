import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { createSellerReview, type ReviewRow } from "@/lib/reviews";

type Props = {
  orderId: string;
  listingId: string | null;
  reviewerId: string;
  revieweeId: string;
  sellerName: string;
  existing?: ReviewRow | null;
  onSubmitted?: (r: ReviewRow) => void;
};

function StarPicker({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (n: number) => void;
  size?: "sm" | "md";
}) {
  const px = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5"
          aria-label={`${n} stjärnor`}
        >
          <Star
            className={`${px} transition ${
              n <= value
                ? "fill-yellow-400 stroke-yellow-500"
                : "stroke-muted-foreground/50 fill-transparent"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function SellerReviewForm({
  orderId,
  listingId,
  reviewerId,
  revieweeId,
  sellerName,
  existing,
  onSubmitted,
}: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [shipping, setShipping] = useState(0);
  const [comm, setComm] = useState(0);
  const [desc, setDesc] = useState(0);
  const [busy, setBusy] = useState(false);

  if (existing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-sm space-y-2">
        <p className="font-medium">Tack för ditt betyg</p>
        <div className="flex items-center gap-2">
          <StarPicker value={existing.rating} onChange={() => {}} size="sm" />
          <span className="text-xs text-muted-foreground">{existing.rating}/5</span>
        </div>
        {existing.comment && (
          <p className="text-xs text-muted-foreground italic">"{existing.comment}"</p>
        )}
      </div>
    );
  }

  async function submit() {
    if (rating < 1) {
      toast.error("Välj ett betyg mellan 1–5");
      return;
    }
    setBusy(true);
    const { data, error } = await createSellerReview({
      orderId,
      listingId,
      reviewerId,
      revieweeId,
      rating,
      comment: comment.trim() || null,
      communicationRating: comm || null,
      descriptionAccuracyRating: desc || null,
      shippingRating: shipping || null,
    });
    setBusy(false);
    if (error || !data) {
      toast.error(error ?? "Kunde inte skicka betyg");
      return;
    }
    toast.success("Tack för ditt betyg");
    onSubmitted?.(data);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-sm space-y-3">
      <div>
        <p className="font-medium">Betygsätt säljaren</p>
        <p className="text-xs text-muted-foreground">
          Hur var din upplevelse med {sellerName}?
        </p>
      </div>

      <div>
        <p className="text-xs font-medium mb-1">Helhetsbetyg</p>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      <div>
        <p className="text-xs font-medium mb-1">Kommentar (valfri)</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Hur gick köpet?"
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs">Snabb leverans</span>
          <StarPicker value={shipping} onChange={setShipping} size="sm" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs">Bra kommunikation</span>
          <StarPicker value={comm} onChange={setComm} size="sm" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs">Stämde med beskrivningen</span>
          <StarPicker value={desc} onChange={setDesc} size="sm" />
        </div>
      </div>

      <button
        disabled={busy || rating < 1}
        onClick={submit}
        className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {busy ? "Skickar..." : "Skicka betyg"}
      </button>
    </div>
  );
}
