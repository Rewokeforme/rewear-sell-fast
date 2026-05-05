import { Outlet } from "@tanstack/react-router";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

export function AppShell({ subtitle }: { subtitle?: string }) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle={subtitle} />
      <main className="mx-auto max-w-2xl px-4 py-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
