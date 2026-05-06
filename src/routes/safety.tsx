import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Säker handel på ReWoke" },
      { name: "description", content: "Tips och rutiner som gör second hand-handel på ReWoke tryggt." },
      { property: "og:title", content: "Säker handel på ReWoke" },
      { property: "og:description", content: "Så handlar du tryggt på ReWoke." },
    ],
  }),
  component: SafetyPage,
});

function SafetyPage() {
  return (
    <PolicyPage
      eyebrow="Trygghet"
      title="Säker handel på ReWoke"
      intro="Vi vill att varje affär ska kännas trygg. Följ råden nedan så minskar du risken för missförstånd och bedrägerier."
      lastUpdated="5 maj 2026"
      sections={[
        { title: "Håll kommunikationen i ReWoke", body: <p>Genom att chatta i appen får vi möjlighet att hjälpa till om något går fel. Affärer utanför ReWoke sker på egen risk.</p> },
        { title: "Dela inte exakt adress i annonsen", body: <p>Ange gärna område eller stadsdel — exakt adress bestäms i chatten med köparen.</p> },
        { title: "Träffas på offentlig plats vid hämtning", body: <p>Välj en bemannad och offentlig plats för fysisk överlämning, gärna på dagtid.</p> },
        { title: "Var försiktig med externa betalningar", body: <p>Var skeptisk om någon ber dig betala via Western Union, kryptovaluta eller länkar du inte känner igen.</p> },
        { title: "Rapportera misstänkt beteende", body: <p>Använd rapportknappen direkt vid misstanke om bedrägeri, hot eller olämpligt innehåll.</p> },
        { title: "Verifierade säljare", body: <p>Säljare med verifieringsbadge har bekräftat sin identitet. Det är ett extra trygghetslager — men ersätter inte sunt förnuft.</p> },
        { title: "Blockera användare", body: <p>Vill du inte längre höra från någon? Blockera användaren via chattens menyknapp.</p> },
      ]}
    />
  );
}
