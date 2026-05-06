import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/ad-rules")({
  head: () => ({
    meta: [
      { title: "Regler för annonser — ReWoke" },
      { name: "description", content: "Vad får och vad får inte säljas på ReWoke." },
      { property: "og:title", content: "Regler för annonser — ReWoke" },
      { property: "og:description", content: "Tillåtna och förbjudna produkter på ReWoke." },
    ],
  }),
  component: AdRulesPage,
});

function AdRulesPage() {
  return (
    <PolicyPage
      eyebrow="Trygghet"
      title="Regler för annonser"
      intro="För att hålla ReWoke tryggt och seriöst gäller följande regler för alla annonser."
      lastUpdated="5 maj 2026"
      sections={[
        { title: "Tillåtna produkter", body: <p>Begagnade och oanvända kläder, skor och accessoarer för dam, herr och barn. Plaggen ska vara hela, rena och i säljbart skick.</p> },
        { title: "Förbjudna produkter", body: <ul><li>Kopior, piratkopior eller varumärkesförfalskningar</li><li>Stulna eller smugglade varor</li><li>Underkläder som är använda</li><li>Farliga eller olagliga produkter</li><li>Produkter av riktig päls eller utrotningshotade djur</li></ul> },
        { title: "Kopior och piratkopior", body: <p>Vi tar nolltolerans mot förfalskningar. Konton som upprepat publicerar kopior stängs av permanent.</p> },
        { title: "Stulna varor", body: <p>Att sälja stöldgods är brottsligt och leder till omedelbar avstängning samt eventuell polisanmälan.</p> },
        { title: "Vilseledande annonser", body: <p>Beskriv plagget korrekt. Felaktig storlek, dolt skick eller missvisande märkesinformation är inte tillåtet.</p> },
        { title: "Bilder och beskrivningar", body: <p>Bilder ska visa det faktiska plagget. Beskrivningar ska vara tydliga och inte innehålla extern reklam eller länkar.</p> },
        { title: "Märkesvaror och äkthet", body: <p>Kan du, ange köpbevis eller annan äkthetsdokumentation i beskrivningen vid premiummärken.</p> },
        { title: "Konsekvenser vid regelbrott", body: <p>Vi kan ta bort annonser, varna, stänga av eller permanent blockera konton som bryter mot reglerna.</p> },
      ]}
    />
  );
}
