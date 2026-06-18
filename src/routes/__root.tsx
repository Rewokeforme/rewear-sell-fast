import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { Footer } from "@/components/Footer";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Sidan hittades inte</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sidan du letar efter finns inte eller har flyttats.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Till startsidan
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#F7F4EF" },
      { title: "ReWoke — Sälj dina kläder på 60 sekunder" },
      {
        name: "description",
        content:
          "Sveriges enklaste second hand-app. Sälj dina kläder snabbt med AI och spara CO₂.",
      },
      { property: "og:title", content: "ReWoke — Sälj dina kläder på 60 sekunder" },
      { property: "og:description", content: "Rewear: Sell Fast is a premium Swedish second-hand platform for selling clothes quickly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ReWoke — Sälj dina kläder på 60 sekunder" },
      { name: "description", content: "Rewear: Sell Fast is a premium Swedish second-hand platform for selling clothes quickly." },
      { name: "twitter:description", content: "Rewear: Sell Fast is a premium Swedish second-hand platform for selling clothes quickly." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/054faedb-e17d-49a8-a9ac-c9390fc0bba8/id-preview-6833bfc2--7cb564f4-7944-43b2-be0d-b6738911428f.lovable.app-1781729493107.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/054faedb-e17d-49a8-a9ac-c9390fc0bba8/id-preview-6833bfc2--7cb564f4-7944-43b2-be0d-b6738911428f.lovable.app-1781729493107.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Footer />
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}
