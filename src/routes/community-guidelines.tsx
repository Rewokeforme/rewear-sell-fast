import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/community-guidelines")({
  head: () => ({
    meta: [
      { title: "Communityregler — Rewear" },
      { name: "description", content: "Reglerna som håller Rewear tryggt, ärligt och välkomnande." },
      { property: "og:title", content: "Communityregler — Rewear" },
      { property: "og:description", content: "Så bidrar du till en trygg och respektfull community." },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <PolicyPage
      eyebrow="Trygghet"
      title="Communityregler"
      intro="Rewear är en plats för stilälskande svenskar som tror på cirkulär mode. Reglerna nedan håller upplevelsen trygg och välkomnande för alla."
      lastUpdated="5 maj 2026"
      sections={[
        { title: "Var respektfull", body: <p>Bemöt andra användare med samma respekt du själv vill mötas av. Trakasserier, hot eller diskriminering tolereras inte.</p> },
        { title: "Sälj endast egna eller tillåtna produkter", body: <p>Allt du lägger ut ska vara ditt eget eller sålt med rättighetshavarens samtycke.</p> },
        { title: "Beskriv plagget ärligt", body: <p>Skick, storlek, märke och eventuella defekter ska anges korrekt. Var transparent — det skapar nöjda köpare och färre tvister.</p> },
        { title: "Använd egna bilder", body: <p>Bilder ska föreställa det faktiska plagget. Stockbilder eller bilder från andra säljare är inte tillåtna.</p> },
        { title: "Förbjudna annonser", body: <p>Kopior, piratkopior, smuggelgods, farliga produkter och varor som strider mot svensk lag är inte tillåtna. Se <a href="/ad-rules">regler för annonser</a>.</p> },
        { title: "Förbjudet beteende", body: <ul><li>Bedrägeriförsök eller försök att flytta affären utanför Rewear</li><li>Spam, masskopiering eller kapade konton</li><li>Vilseledande information eller dolda avgifter</li></ul> },
        { title: "Rapportering", body: <p>Ser du något som inte hör hemma? Använd rapportknappen på annonser, profiler och konversationer. Vi granskar varje rapport.</p> },
        { title: "Konsekvenser vid regelbrott", body: <p>Vi kan ta bort annonser, varna, stänga av eller permanent blockera konton beroende på allvarsgrad.</p> },
      ]}
    />
  );
}
