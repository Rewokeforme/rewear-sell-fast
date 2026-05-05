import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/seller-guide")({
  head: () => ({
    meta: [
      { title: "Säljarguide — Rewear" },
      { name: "description", content: "Så skapar du en annons som säljer på Rewear." },
      { property: "og:title", content: "Säljarguide — Rewear" },
      { property: "og:description", content: "Tips, bilder, prissättning och leverans — bli en bättre säljare." },
    ],
  }),
  component: SellerGuide,
});

function SellerGuide() {
  return (
    <PolicyPage
      eyebrow="För användare"
      title="Säljarguide"
      intro="En bra annons säljer snabbare och till bättre pris. Så här lyckas du på Rewear."
      lastUpdated="5 maj 2026"
      sections={[
        { title: "Så skapar du en bra annons", body: <p>Ärlighet, bra bilder och en tydlig beskrivning är receptet. Lägg några extra minuter — det lönar sig.</p> },
        { title: "Bilder", body: <ul><li>Fotografera i dagsljus, gärna mot en neutral bakgrund</li><li>Visa plagget från flera vinklar — fram, bak, detaljer</li><li>Fotografera eventuella defekter tydligt</li></ul> },
        { title: "Titel och beskrivning", body: <p>Använd märke, plaggtyp och storlek i titeln. I beskrivningen — material, passform, skick och varför du säljer.</p> },
        { title: "Prissättning", body: <p>Kolla liknande annonser på Rewear. Vår AI ger ett prisförslag baserat på märke och skick.</p> },
        { title: "Leveransalternativ", body: <p>Du kan välja mellan frakt, lokal upphämtning eller båda. Tydlighet kring leverans gör köparen tryggare.</p> },
        { title: "Kommunikation med köpare", body: <p>Svara snabbt och vänligt. Snabba säljare får högre betyg och fler affärer.</p> },
        { title: "Vad du inte får sälja", body: <p>Se <a href="/ad-rules">regler för annonser</a> för fullständig lista över förbjudna varor.</p> },
      ]}
    />
  );
}
