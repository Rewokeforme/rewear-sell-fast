## Mål
Bygga om "köparskyddet" till ett balanserat **köpar- och säljarskydd** med tvistflöde, beviskrav, tracking och lokal hämtning. Inga löften om automatisk återbetalning.

---

## 1. Copy-uppdatering (UI)
- I `src/routes/checkout.$orderId.tsx`: byt rubrik "ReWoke köparskydd" → "ReWoke köpar- och säljarskydd" och de 3 punkterna till de 4 nya neutrala punkterna.
- Samma uppdatering på `src/routes/orders.$orderId.tsx` om motsvarande ruta finns där.

## 2. Två nya sektioner på ordersidan (`orders.$orderId.tsx`)
- **Säljarskydd** med 4 bullets (spårbar frakt, spara kvitto, skicka först när inlämnat, leveransbekräftelse = levererad).
- **Köparskydd** med 4 bullets (kontrollera, rapportera inom 48h, bifoga bilder, godkänd tvist).
- Liten regel-rad: "Vid godkänd retur återbetalas köparen normalt först när varan har returnerats eller när ReWoke har fattat beslut."

## 3. Databas — ny tabell `disputes` + utökade `orders`-fält
Migration:
```sql
-- orders: tracking + tidsstämplar
alter table orders
  add column tracking_number text,
  add column carrier text,
  add column shipped_at timestamptz,
  add column delivered_at timestamptz,
  add column buyer_review_deadline timestamptz,
  add column buyer_handover_confirmed_at timestamptz,
  add column seller_handover_confirmed_at timestamptz;

-- enums
create type dispute_reason as enum
  ('item_not_received','item_not_as_described','damaged_item',
   'wrong_item','suspected_fraud','other');
create type dispute_status as enum
  ('open','awaiting_buyer_evidence','awaiting_seller_response',
   'under_review','resolved_buyer','resolved_seller','closed');

create table disputes (
  id uuid pk default gen_random_uuid(),
  order_id uuid not null references orders(id),
  opened_by uuid not null,           -- buyer eller seller user id
  reason dispute_reason not null,
  description text,
  buyer_evidence_urls text[] default '{}',
  seller_evidence_urls text[] default '{}',
  carrier_tracking_snapshot jsonb,
  status dispute_status not null default 'open',
  admin_decision text,
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

RLS:
- Endast buyer/seller på ordern + admin kan läsa.
- Endast buyer eller seller (parts på ordern) kan insert som `opened_by = auth.uid()`.
- Endast admin kan sätta `admin_decision`, `admin_notes`, `status = resolved_*/closed`.
- Trigger sätter `updated_at`.

Trigger: när order går till `delivered` → sätt `delivered_at = now()` och `buyer_review_deadline = now() + 48h`.

Trigger på `orders.status = 'shipped'` → `shipped_at = now()`.

Uppdatera `orders_enforce_transition` så att seller endast kan markera shipped när det finns `tracking_number` (för shipping-orders).

## 4. UI-flöde tvist (MVP)
Ny komponent `DisputeDialog` på `orders.$orderId.tsx`:
- Knapp "Öppna tvist" syns för buyer när `status in (paid, shipped, delivered)` eller seller (för "suspected_fraud"/"other").
- Reason-select. Vid `item_not_received`: visa tracking-snapshot om finns + varning om "Transportören visar levererat" om delivered.
- Vid `item_not_as_described`/`damaged_item`/`wrong_item`: kräv minst 1 bild (upload till `listing-images` bucket subpath `disputes/`) + beskrivning. Visa retur-meddelande.
- Skapa rad i `disputes`. Sätt order.status = `disputed`.

`disputes.ts` lib med:
- `createDispute`, `getDisputeForOrder`, `addBuyerEvidence`, `addSellerEvidence`.

## 5. Lokal hämtning – dubbel-bekräftelse
På `orders.$orderId.tsx` när `delivery_method = 'pickup'` och `status = 'paid'`:
- Knapp för buyer: "Bekräfta mottaget" → sätter `buyer_handover_confirmed_at`.
- Knapp för seller: "Bekräfta överlämnat" → `seller_handover_confirmed_at`.
- Server-side trigger: när båda satta → status `delivered` → `completed`.

Implementeras som DB-trigger på orders update.

## 6. Tracking UI för säljare
- I shipped-flödet på orders-sidan, säljaren fyller `carrier` + `tracking_number` innan "Markera som skickad".
- Visas som info för köparen.

## 7. Inga lovord
- Tar bort "Få full återbetalning…" / "garanterad" / "escrow" texter där de förekommer.
- Footer/hjälptexter: "Betalningen hanteras via ReWoke. Utbetalning sker enligt villkor."

---

## Filer som skapas/ändras
- **migration** (`disputes` + orders-fält + triggers + RLS)
- **ny** `src/lib/disputes.ts`
- **ny** `src/components/DisputeDialog.tsx`
- **ny** `src/components/ProtectionInfo.tsx` (köpar+säljarskydd block, återanvänds)
- **edit** `src/routes/checkout.$orderId.tsx` (ny copy)
- **edit** `src/routes/orders.$orderId.tsx` (ProtectionInfo-block, tracking-input för säljare, dispute-knapp, pickup-confirmations)
- **edit** `src/lib/orders.ts` (typer + ev. helpers för tracking & handover)

---

## Detta gör vi INTE i denna fas
- QR-kod för överlämning (förberett men inte byggt)
- Riktig betalning / utbetalning
- Automatisk transitionering till `completed` efter `buyer_review_deadline` (kommenterad pg_cron-stub kan läggas in senare)
