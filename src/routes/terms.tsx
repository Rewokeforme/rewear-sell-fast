import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Användarvillkor — ReWoke" },
      { name: "description", content: "Användarvillkor för ReWoke, Sveriges premium second hand-plattform för kläder." },
      { property: "og:title", content: "Användarvillkor — ReWoke" },
      { property: "og:description", content: "Villkor som gäller mellan dig och ReWoke." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Juridiskt"
      title="Användarvillkor"
      intro="Dessa villkor reglerar din användning av ReWoke — en svensk plattform för köp och försäljning av begagnade kläder, skor och accessoarer."
      lastUpdated="5 maj 2026"
      draftNotice
      sections={[
        {
          title: "Om tjänsten",
          body: <p>ReWoke tillhandahåller en digital marknadsplats där privatpersoner kan köpa och sälja begagnade plagg. Vi är inte part i transaktionerna mellan användare utan agerar som teknisk förmedlare.</p>,
        },
        {
          title: "Konto och användaransvar",
          body: <>
            <p>För att skapa annonser eller chatta krävs ett konto. Du ansvarar för att uppgifterna du anger är korrekta och för all aktivitet på ditt konto.</p>
            <ul><li>Du måste vara minst 15 år.</li><li>Du får inte dela ditt konto med andra.</li><li>Misstänkt obehörig åtkomst ska rapporteras direkt.</li></ul>
          </>,
        },
        {
          title: "Annonser och innehåll",
          body: <p>Du behåller rättigheterna till innehåll du lägger upp men ger ReWoke en licens att visa det inom tjänsten. Annonser måste följa våra <a href="/ad-rules">regler för annonser</a>.</p>,
        },
        {
          title: "Köp och försäljning",
          body: <p>Affärer sker direkt mellan köpare och säljare. Båda parter förväntas kommunicera respektfullt, beskriva plagg ärligt och fullfölja överenskomna affärer.</p>,
        },
        {
          title: "Förbjudna produkter",
          body: <p>Det är förbjudet att sälja kopior, stulna varor, smuggelgods, farliga produkter eller varor som strider mot svensk lag. Se fullständig lista i <a href="/ad-rules">regler för annonser</a>.</p>,
        },
        {
          title: "Meddelanden och kommunikation",
          body: <p>All kommunikation om köp ska ske inom ReWoke. Det skyddar både köpare och säljare och låter oss agera vid eventuella tvister.</p>,
        },
        {
          title: "Avstängning och moderering",
          body: <p>ReWoke kan ta bort annonser, varna eller stänga av konton som bryter mot dessa villkor eller våra <a href="/community-guidelines">communityregler</a>.</p>,
        },
        {
          title: "Ansvarsbegränsning",
          body: <p>ReWoke ansvarar inte för transaktioner mellan användare, varors skick eller leveransproblem. Vi arbetar dock aktivt för att hålla plattformen trygg.</p>,
        },
        {
          title: "Ändringar av villkor",
          body: <p>Vi kan uppdatera dessa villkor. Vid väsentliga ändringar meddelar vi dig via e-post eller i appen minst 30 dagar i förväg.</p>,
        },
        {
          title: "Kontakt",
          body: <p>Frågor om villkoren? Mejla <a href="mailto:support@rewoke.se">support@rewoke.se</a>.</p>,
        },
      ]}
    />
  );
}
