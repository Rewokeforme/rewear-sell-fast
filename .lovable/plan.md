## Rewear — premium svensk second hand-plattform

En mobil-first PWA som ska kännas som ett skandinaviskt modemagasin. Huvudlöftet: *Sälj dina kläder på under 60 sekunder med hjälp av AI.*

---

### Designsystem

- **Bakgrund:** cream-vit `#F7F4EF`
- **Text/UI:** kolsvart `#111111`
- **Hållbarhet/primary:** skogsgrön `#4A6741`
- **Accent:** terrakotta `#C8956C`
- Typografi: serif display (rubriker, t.ex. Fraunces/Playfair) + ren sans-serif (brödtext, Inter)
- Stora bilder i 3:4, rundade kort (radius lg/xl), generös whitespace, subtila skuggor
- Nedre tab-bar på mobil: Hem · Sök · Sälj (CTA, terrakotta) · Inkorg · Profil

---

### Routes (TanStack Start)

```
/                       hemflöde (grid + kategoripiller)
/search                 sök & filter
/listing/$id            plaggsida
/sell                   skapa annons (multistegs-flöde)
/inbox                  konversationslista
/inbox/$conversationId  chat
/profile/$userId        publik säljarprofil
/me                     min profil + statistik
/me/listings            mina annonser
/me/favorites           sparade
/login, /signup
/admin                  adminpanel (skyddad)
```

Skyddade routes via `_authenticated` layout. `/admin` ligger i `_authenticated/_admin` med rollkontroll.

---

### MVP-funktioner

**1. Auth & profil**
- E-postinloggning (Supabase Auth)
- Profil: namn, ort, avatar, bio
- Statistik på `/me`: aktiva annonser, sålda, snittbetyg, total CO₂ sparad, Rewear Score, badges

**2. Hemflöde**
- Dubbel-grid produktkort: bild (3:4), märke (caps small), titel, storlek, pris, liten grön CO₂-badge ("−12 kg CO₂")
- Horisontell kategorirad: Jackor, Toppar, Byxor, Skor, Accessoarer, Vintage, Barn
- Sök: märke, kategori, storlek, prisintervall, skick
- Sortering: nyast, lägst pris, högst pris

**3. Sälj-flödet (under 60 sekunder)**
- Steg 1: ladda upp 1–5 bilder (drag-n-drop / kameraknapp)
- Steg 2: knapp **"Föreslå med AI"** (placeholder — fyller fält med exempelvärden tills riktig AI kopplas in)
- Steg 3: formulär (märke, titel, kategori, storlek, skick, pris, beskrivning)
- Prisguide-placeholder: *"Liknande plagg brukar säljas för X–Y kr"* (räknas som median ±30 % på publicerade annonser i samma kategori)
- Publicera → land på plaggsidan

**4. Plaggsida**
- Stor 3:4-bild med swipe-galleri
- Märke, titel, pris (stor), storlek, skick
- CO₂-besparing badge + förklaring
- Säljarkort (avatar, namn, ort, betyg, antal sålda, badge)
- CTAs: **Visa intresse**, **Skicka meddelande**, **Spara** (hjärta)

**5. Chatt & intresse**
- "Visa intresse" → skapar/öppnar konversation med fördefinierat meddelande
- Realtids-chat via Supabase Realtime
- Inkorg med olästa-prick
- Notiser i appen (toast + badge på tab)

**6. Rewear Score & badges**
- +10 per sålt plagg, +5 per positivt betyg (≥4), +1 per kg CO₂
- Badges: *Ny säljare*, *Betrodd säljare* (10 sålda), *Premium Seller* (25 sålda + snitt ≥4.7)
- Beräknas server-side via trigger eller view

**7. CO₂-logik**
- Tabell `co2_factors` med kategori → kg sparad
- Visas på varje annons + totalsumma på profil

**8. Adminpanel**
- Lista användare, annonser, rapporter, försäljningsstatistik
- Ta bort annonser, markera användare verifierade, hantera rapporter
- Första registrerade användaren får automatiskt `admin`-roll via trigger

---

### Databasschema (Supabase)

Levereras som SQL-migration du kör i ditt egna Supabase-projekt.

```text
profiles            id (=auth.uid), full_name, city, avatar_url, bio,
                    is_verified, rewear_score, created_at
user_roles          id, user_id, role (enum: admin, user)
categories          id, slug, name_sv, sort_order
co2_factors         category_id, kg_saved
listings            id, seller_id, category_id, title, brand, size,
                    condition, price_sek, description, status
                    (active/sold/removed), ai_detected_brand,
                    ai_suggested_price, ai_generated_description,
                    co2_saved_kg, created_at
listing_images      id, listing_id, url, position
favorites           user_id, listing_id, created_at
conversations       id, listing_id, buyer_id, seller_id, last_message_at
messages            id, conversation_id, sender_id, body, read_at, created_at
reviews             id, reviewer_id, reviewee_id, listing_id, rating, comment
reports             id, reporter_id, listing_id, reason, status, created_at
```

**RLS-principer:**
- `profiles`: alla kan läsa publika fält, bara ägare uppdaterar
- `listings`: alla läser aktiva, ägare CRUD egna, admin tar bort
- `messages`/`conversations`: bara deltagare läser/skriver
- `favorites`: bara ägare
- `reviews`: bara köpare av sålt plagg kan skriva
- `user_roles`: läses via `has_role()` security definer-funktion (förhindrar rekursion)
- Admin via `has_role(auth.uid(), 'admin')`

Trigger: vid första `auth.users.insert` → tilldela `admin`-roll. Övriga får `user`.

---

### Tekniska detaljer

- **Stack:** TanStack Start + React 19 + TypeScript + Tailwind v4 + shadcn/ui
- **Backend:** ditt egna Supabase-projekt (du klistrar in `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- **Storage:** Supabase Storage bucket `listing-images` (public read, RLS på write)
- **Realtid:** Supabase Realtime för messages
- **PWA:** manifest + service worker, installerbar, offline-shell för hemflöde
- **Server-funktioner:** `createServerFn` med `requireSupabaseAuth` för skyddade reads/writes; `supabaseAdmin` endast i admin-flöden
- **Validering:** Zod på alla formulär och server functions
- **Bilder:** klient-sidig kompression före upload (max 1600px, webp)
- **AI-placeholder:** knapp finns, fält finns i DB, men handlern returnerar bara fördefinierade förslag tills riktig AI kopplas in

---

### Leverans

Jag kommer att:
1. Sätta upp routerstruktur, designsystem (cream/svart/grön/terrakotta) och layout-komponenter
2. Generera SQL-migration för hela schemat + RLS + triggers + seed (kategorier, co2_factors) — du kör i ditt Supabase
3. Bygga auth-flöde, hemflöde, plaggsida, sälj-flöde, chat, profil, admin
4. Lägga in PWA-manifest

**Du behöver:** lägga in dina Supabase-nycklar och köra migrations-SQL:en i SQL Editor.

**Inte med i v1** (förberett i schema/UI): Swish/betalning, fraktetiketter, riktig AI-bildanalys.