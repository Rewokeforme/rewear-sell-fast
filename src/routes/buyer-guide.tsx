import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/buyer-guide")({
  head: () => ({
    meta: [
      { title: "Köparguide — ReWoke" },
      { name: "description", content: "Så hittar du fynd och handlar tryggt på ReWoke." },
      { property: "og:title", content: "Köparguide — ReWoke" },
      { property: "og:description", content: "Hitta rätt plagg, ställ rätt frågor, handla tryggt." },
    ],
  }),
  component: BuyerGuide,
});

function BuyerGuide() {
  return (
    <PolicyPage
      eyebrow="För användare"
      title="Köparguide"
      intro="Second hand-handel är roligast när du vet vad du letar efter och vad du ska kolla efter."
      lastUpdated="5 maj 2026"
      sections={[
        { title: "Så hittar du rätt plagg", body: <p>Använd filter för storlek, märke, skick och pris. Spara sökningar och följ favoritsäljare för att få notiser om nya plagg.</p> },
        { title: "Kontrollera skick och storlek", body: <p>Läs beskrivningen noga. Storlekar varierar mellan märken — be gärna om mått om du är osäker.</p> },
        { title: "Ställ frågor i chatten", body: <p>Be om fler bilder, fråga om material eller passform. Bra säljare svarar gärna.</p> },
        { title: "Leverans och hämtning", body: <p>Bestäm leveranssätt redan i chatten. Vid lokal hämtning — välj offentlig plats.</p> },
        { title: "Rapportera problem", body: <p>Råkar du ut för en oseriös säljare eller ett plagg som inte motsvarar beskrivningen — använd rapportknappen.</p> },
      ]}
    />
  );
}
