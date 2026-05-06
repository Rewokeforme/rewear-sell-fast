import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/shipping")({
  head: () => ({
    meta: [
      { title: "Frakt & leverans — ReWoke" },
      { name: "description", content: "Så fungerar frakt, hämtning och leverans på ReWoke." },
      { property: "og:title", content: "Frakt & leverans — ReWoke" },
      { property: "og:description", content: "Skickas, hämtas eller möts upp — så fungerar leverans." },
    ],
  }),
  component: ShippingPage,
});

function ShippingPage() {
  return (
    <PolicyPage
      eyebrow="För användare"
      title="Frakt & leverans"
      intro="På ReWoke väljer säljare själva hur plagget levereras. Här är dina alternativ."
      lastUpdated="5 maj 2026"
      sections={[
        { title: "Skickas av säljaren", body: <p>Säljaren postar plagget med valfri operatör. Spårbart paket rekommenderas alltid.</p> },
        { title: "Lokal upphämtning", body: <p>Köpare och säljare kommer överens om en plats för fysisk överlämning, gärna offentlig och bemannad.</p> },
        { title: "Köparen betalar frakt", body: <p>Standard. Fraktkostnaden visas tydligt i annonsen innan köp.</p> },
        { title: "Säljaren betalar frakt", body: <p>Många säljare väljer fri frakt för att locka fler köpare.</p> },
        { title: "Rekommenderade leveransrutiner", body: <ul><li>Förpacka plagget noggrant — gärna i återanvänt material</li><li>Skicka inom utlovad tid</li><li>Dela spårningsnummer i chatten</li></ul> },
        { title: "Framtida fraktintegrationer", body: <p>Vi arbetar på integrerad frakt med fraktsedlar direkt i appen. Mer information kommer.</p> },
      ]}
    />
  );
}
