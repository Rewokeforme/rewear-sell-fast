# Rewear — Supabase setup

## 1. Skapa env-fil
Skapa `.env` i projektroten med:

```
VITE_SUPABASE_URL=https://<projekt>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<din anon/publishable key>
```

## 2. Kör databas-schemat
Öppna Supabase Dashboard → SQL Editor → klistra in innehållet från `db/schema.sql` och kör.

Det skapar:
- Tabeller: profiles, user_roles, categories, co2_factors, listings, listing_images, favorites, conversations, messages, reviews, reports
- RLS-policies (säkerhet per användare)
- Triggers (auto-profil vid signup, första användaren blir admin, CO₂-beräkning, Rewear Score)
- Storage bucket `listing-images` (public read, auth upload)
- Seed: 8 kategorier + CO₂-faktorer
- Realtime på messages och conversations

## 3. Aktivera e-postinloggning
Authentication → Providers → Email aktiverad. För dev kan du stänga av "Confirm email" så slipper du verifiering.

## 4. Klart
Första användaren som registrerar sig blir automatiskt admin och får tillgång till `/admin`.
