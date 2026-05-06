## Mål
Bygg hela orderflödet i ReWoke utan riktig betalningsintegration. Stripe kopplas in senare — nu simulerar vi "Fortsätt till betalning" så ordern blir `paid`.

## 1. Databas (migration)

### Ny enum
```
order_status: pending_payment | paid | shipped | delivered | completed | cancelled | disputed | refunded
```

### Ny tabell `orders`
- `id` uuid PK
- `listing_id` uuid → listings
- `buyer_id` uuid
- `seller_id` uuid
- `status` order_status default `pending_payment`
- `item_price` integer (SEK)
- `shipping_price` integer default 0
- `platform_fee` integer default 0
- `total_amount` integer
- `currency` text default `SEK`
- `delivery_method` text (`shipping` | `pickup` | `both`)
- `created_at`, `updated_at` timestamptz

Index på `buyer_id`, `seller_id`, `listing_id`, `status`.

### Ny status på listings
Lägg till `'reserved'` i `listing_status`-enum (utöver active/sold/removed).

### Triggers
- `set_updated_at` på orders.
- När order skapas (`pending_payment` eller `paid`) → sätt listing.status = `reserved` (om den var `active`).
- När order → `completed` → listing.status = `sold`.
- När order → `cancelled` / `refunded` → listing.status tillbaka till `active` (om reserved).

### Validering
- BEFORE INSERT trigger: kasta fel om `buyer_id = seller_id`.
- BEFORE INSERT trigger: säkerställ att listing.status inte redan är `sold` eller `reserved` av annan order.

### RLS
- SELECT: `auth.uid() = buyer_id OR auth.uid() = seller_id OR has_role(auth.uid(),'admin')`
- INSERT: `auth.uid() = buyer_id` AND `buyer_id <> seller_id` (kontroll i WITH CHECK + trigger)
- UPDATE: 
  - Köpare får uppdatera till `paid` (simulering), `delivered`, `completed`, `disputed`.
  - Säljare får uppdatera till `shipped`, `cancelled`.
  - Admin får allt.
  - Implementeras säkrast via två policies + en SECURITY DEFINER-funktion `can_transition_order(order_id, new_status)`.

## 2. Frontend

### `src/lib/orders.ts` (ny)
Helpers: `createOrder`, `simulatePayment`, `markShipped`, `markDelivered`, `markCompleted`, `cancelOrder`, `getMyPurchases`, `getMySales`.

### Plaggsida (`src/routes/listing.$id.tsx`)
- Visa knappar beroende på listing.status och ägarskap:
  - `active` + ej egen + inloggad → **Köp nu**, **Skicka meddelande**, **Spara**
  - `reserved` → badge "Reserverad" (knapp inaktiverad om ej köparen)
  - `sold` → badge "Såld"
  - egen annons → ingen Köp nu-knapp
- "Köp nu" → skapar order med `pending_payment` → navigerar till `/checkout/$orderId`.

### `src/routes/checkout.$orderId.tsx` (ny)
- Visar orderöversikt (produkt, pris, frakt, totalt).
- Knapp **Fortsätt till betalning** → uppdaterar status till `paid` (simulering) → redirect till `/orders/$orderId` eller `/me/purchases`.
- Säkerhet: bara `buyer_id` får se sidan.

### `src/routes/me.purchases.tsx` (ny) — "Mina köp"
Lista: produktbild, titel, pris, säljare, status-badge, leveranssätt. Klick → orderdetalj.

### `src/routes/me.sales.tsx` (ny) — "Mina försäljningar"
Lista: produktbild, titel, köpare, status-badge. Knapp **Markera som skickad** för `paid`-orders. (Senare: markera levererad/completed.)

### `src/routes/orders.$orderId.tsx` (ny) — orderdetalj
Visar full info, statushistorik-light, åtgärder beroende på roll och status:
- Köpare: "Bekräfta mottagen" (delivered → completed), "Öppna tvist".
- Säljare: "Markera som skickad", "Avbryt order" (om paid och ej shipped).

### Navigation
Lägg till "Mina köp" och "Mina försäljningar" i `src/routes/me.tsx` (eller header/profilmeny).

### Statusbadge-komponent
`src/components/OrderStatusBadge.tsx` — översätter statusar till svensk text + färg via design tokens.

## 3. Säkerhet (sammanfattning)
- DB: RLS + triggers förhindrar self-purchase och otillåtna transitioner.
- Frontend: dölj knappar baserat på roll, men förlita sig aldrig bara på UI.
- Reserved-state förhindrar dubbla köp av samma plagg.

## 4. Vad som INTE ingår nu
- Riktig Stripe-integration (kopplas in i nästa steg där `simulatePayment` byts mot Stripe Checkout).
- Refund-flöde (status finns men ingen UI ännu).
- Tvistehantering (status finns, minimal UI).
- Notifikationer vid statusändring (kan läggas till efter migrationen är godkänd).

## Tekniska detaljer
- Priser lagras som heltals-SEK (matchar `listings.price_sek`).
- `platform_fee` = 0 tills vidare; fältet finns för Stripe-tiden.
- `total_amount` = `item_price + shipping_price + platform_fee`, sätts via trigger.
- Migration körs via `supabase--migration`. Efter godkännande: bygg frontend.

## Implementationsordning
1. Migration (orders-tabell, enums, triggers, RLS).
2. `src/lib/orders.ts` + `OrderStatusBadge`.
3. Uppdatera `listing.$id.tsx` med ny köp-UI.
4. `checkout.$orderId.tsx`.
5. `me.purchases.tsx` + `me.sales.tsx`.
6. `orders.$orderId.tsx`.
7. Länkar i `me.tsx`/header.