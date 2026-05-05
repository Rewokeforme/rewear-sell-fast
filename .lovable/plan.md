## Mål

Admin ska kunna se, hantera och svara på alla inskickade rapporter direkt i adminportalen. När admin svarar på en rapport ska personen som rapporterade få en notis i sin inkorg (under "Notiser") med svaret från Admin.

## Vad som byggs

### 1. Databas (migration)

Två tabeller hanterar redan rapporter:
- `reports` — rapporter på **annonser** (från annonssidan)
- `user_reports` — rapporter på **konversationer/användare** (från chatten)

Lägg till för båda:
- `admin_response` (text) — admins svarstext
- `responded_by` (uuid) — admin-id
- `responded_at` (timestamptz)

Säkerhet:
- RLS på `reports`: lägg till en `UPDATE`-policy så att enbart admin (via `has_role`) kan uppdatera status och skriva svar. Idag finns ingen update-policy alls på `reports`, vilket gör knappen "Lös" trasig — fixas nu.
- `user_reports` har redan admin-update-policy.
- Utöka `notifications.type`-enumen med ett nytt värde `admin_reply` så vi kan visa svaren snyggt i inkorgen.

Ingen automatisk trigger — admins svar skickas explicit från admin-UI:t (en `INSERT` i `notifications` med `user_id = reporter_id`, `type = 'admin_reply'`, `title = "Svar från Rewear-teamet"`, `body = svaret`, `related_listing_id` eller `related_conversation_id` beroende på rapporttyp).

### 2. Adminportalen (`src/routes/admin.tsx`)

Bygg om "Rapporter"-fliken till en riktig hanteringsvy:

- **Två underflikar**: "Annonser" och "Konversationer/användare", med antalsbadge för öppna rapporter.
- **Filter**: Öppna · Besvarade · Alla.
- **Rapportkort** visar:
  - Rapporterad anledning + ev. fri beskrivning
  - Vem som rapporterade (namn → länk till profil)
  - Länk till annonsen eller konversationen
  - Datum
  - Status-pill (Öppen / Besvarad / Stängd)
  - Tidigare svar om sådant finns (admin + tidsstämpel)
- **Åtgärdsknappar**: "Svara", "Markera som löst", "Ignorera".
- **Svar-dialog** (återanvänd vår nya `ReportDialog`-mönstring men i ny `AdminReplyDialog`-komponent) med:
  - Snabbsvar-pillar: "Tack för rapporten — vi har granskat och åtgärdat", "Vi behöver mer information", "Annonsen följer våra regler", "Vi har varnat användaren", "Annonsen har tagits bort".
  - Fritextfält (obligatoriskt).
  - Skicka → uppdaterar rapporten med svar/responded_by/responded_at, sätter status till `resolved`, och skapar en notis till rapportören.

### 3. Inkorg/notiser (`src/routes/notifications.tsx`, `src/lib/notifications.ts`)

- Stöd nya typen `admin_reply` i `NotificationRow`.
- Rendera admin-svar med distinkt design: liten "Admin"-badge med sköld-ikon, accentfärg, och länk till relaterad annons/konversation om sådan finns.
- Räknas redan som olästa via befintlig `useUnreadNotifications`.

### 4. Småfix

- Visa antal öppna rapporter som badge på "Rapporter"-fliken i admin.
- I admin: gruppera under en gemensam typedef `ReportItem` så annons- och konversationsrapporter kan visas i samma lista vid behov.

## Tekniska detaljer

**Migration (sammanfattat):**
```sql
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'admin_reply';

ALTER TABLE public.reports
  ADD COLUMN admin_response text,
  ADD COLUMN responded_by uuid,
  ADD COLUMN responded_at timestamptz;

ALTER TABLE public.user_reports
  ADD COLUMN admin_response text,
  ADD COLUMN responded_by uuid,
  ADD COLUMN responded_at timestamptz;

CREATE POLICY "reports admin update"
ON public.reports FOR UPDATE
USING (has_role(auth.uid(), 'admin'));
```

**Notifikations-insert (admin-flödet):**
```ts
await supabase.from("notifications").insert({
  user_id: report.reporter_id,
  type: "admin_reply",
  title: "Svar från Rewear-teamet",
  body: replyText,
  related_listing_id: report.listing_id ?? null,
  related_conversation_id: report.reported_conversation_id ?? null,
});
```

**Filer som ändras/skapas:**
- `supabase/migrations/<ny>.sql` — schema + policy + enum
- `src/integrations/supabase/types.ts` — regenereras automatiskt efter migrationen
- `src/routes/admin.tsx` — byggs om för rapportflöden
- `src/components/AdminReplyDialog.tsx` — ny dialog för admin-svar
- `src/routes/notifications.tsx` — rendera nya `admin_reply`-typen
- `src/lib/notifications.ts` — utöka `NotificationRow.type`

Inga edge functions behövs — allt hanteras direkt mot databasen med RLS.
