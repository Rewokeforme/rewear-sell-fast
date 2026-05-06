import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookiepolicy — ReWoke" },
      { name: "description", content: "Så använder ReWoke cookies för att förbättra din upplevelse." },
      { property: "og:title", content: "Cookiepolicy — ReWoke" },
      { property: "og:description", content: "Så använder vi cookies på ReWoke." },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <PolicyPage
      eyebrow="Juridiskt"
      title="Cookiepolicy"
      intro="Vi använder cookies för att tjänsten ska fungera, för att förstå hur den används och — med ditt samtycke — för relevanta erbjudanden."
      lastUpdated="5 maj 2026"
      sections={[
        { title: "Vad cookies är", body: <p>Cookies är små textfiler som sparas på din enhet när du besöker en webbplats. De gör att vi kan känna igen din enhet och förbättra upplevelsen.</p> },
        { title: "Nödvändiga cookies", body: <p>Krävs för att du ska kunna logga in, hålla en session aktiv och använda kärnfunktioner som inkorg och favoriter. Dessa kan inte stängas av.</p> },
        { title: "Analyscookies", body: <p>Hjälper oss förstå hur ReWoke används så att vi kan förbättra tjänsten. Aggregerad och anonymiserad data.</p> },
        { title: "Marknadsföringscookies", body: <p>Används endast om du samtycker. De gör det möjligt att visa relevanta erbjudanden i andra kanaler.</p> },
        { title: "Hantera samtycke", body: <p>Du kan ändra ditt samtycke när som helst via cookie-inställningarna nederst på sidan eller via din webbläsares inställningar.</p> },
        { title: "Kontakt", body: <p>Frågor? Mejla <a href="mailto:support@rewoke.se">support@rewoke.se</a>.</p> },
      ]}
    />
  );
}
