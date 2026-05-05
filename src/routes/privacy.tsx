import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Integritetspolicy — Rewear" },
      { name: "description", content: "Så hanterar Rewear dina personuppgifter — transparent, tryggt och i enlighet med GDPR." },
      { property: "og:title", content: "Integritetspolicy — Rewear" },
      { property: "og:description", content: "Så hanterar vi dina personuppgifter på Rewear." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Juridiskt"
      title="Integritetspolicy"
      intro="Vi behandlar dina personuppgifter med respekt och endast i den omfattning som krävs för att tjänsten ska fungera."
      lastUpdated="5 maj 2026"
      draftNotice
      sections={[
        { title: "Vilka personuppgifter vi samlar in", body: <p>Vi samlar in namn, e-postadress, profilbild, ort, IP-adress, enhetsinformation samt innehållet i annonser och meddelanden du själv skapar.</p> },
        { title: "Varför vi behandlar personuppgifter", body: <p>Behandlingen sker för att kunna tillhandahålla tjänsten, möjliggöra köp och försäljning, hålla plattformen trygg samt utveckla Rewear.</p> },
        { title: "Konto, annonser och meddelanden", body: <p>Information du publicerar i annonser visas offentligt. Meddelanden mellan köpare och säljare lagras för att möjliggöra dialog och hantera eventuella tvister.</p> },
        { title: "Betalningar och verifiering", body: <p>Om Rewear i framtiden erbjuder integrerad betalning eller säljarverifiering kan ytterligare uppgifter behandlas av betrodda partners. Detta beskrivs då separat.</p> },
        { title: "Lagringstid", body: <p>Personuppgifter lagras så länge ditt konto är aktivt. Vid radering anonymiseras eller tas data bort, med undantag för information vi enligt lag måste behålla.</p> },
        { title: "Delning med leverantörer", body: <p>Vi använder noga utvalda leverantörer för hosting, e-post, analys och support. Dessa hanterar uppgifter enligt våra instruktioner.</p> },
        { title: "Användarens rättigheter", body: <p>Du har rätt till tillgång, rättelse, radering, dataportabilitet och invändning mot behandling. Hör av dig till oss för att utöva dina rättigheter.</p> },
        { title: "Kontakt för dataskydd", body: <p>Mejla <a href="mailto:support@rewear.se">support@rewear.se</a> med ärendetyp "Dataskydd".</p> },
      ]}
    />
  );
}
