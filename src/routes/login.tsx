import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);

  const INVITE_CODE = "Deje2026";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password.length < 6) {
          toast.error("Lösenordet måste vara minst 6 tecken.");
          return;
        }
        if (password !== confirmPassword) {
          toast.error("Lösenorden matchar inte.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) {
          console.error("[signup] error:", error);
          throw error;
        }
        // Om e-postbekräftelse är på finns ingen session direkt
        if (!data.session) {
          toast.success(
            "Konto skapat. Kolla din e-post och bekräfta för att logga in.",
          );
          setMode("signin");
          return;
        }
        toast.success("Konto skapat. Du är inloggad.");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("[signin] error:", error);
          throw error;
        }
        toast.success("Välkommen tillbaka.");
        navigate({ to: "/" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Okänt fel";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="font-display text-3xl">
          {mode === "signin" ? "Välkommen tillbaka" : "Skapa konto"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Kom igång på under en minut.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <Field label="Namn">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input"
                placeholder="Ditt namn"
                autoComplete="name"
              />
            </Field>
          )}
          <Field label="E-post">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="du@exempel.se"
              autoComplete="email"
            />
          </Field>
          <Field label="Lösenord">
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Minst 6 tecken"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </Field>
          {mode === "signup" && (
            <Field label="Bekräfta lösenord">
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Skriv lösenordet igen"
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="mt-1 text-xs text-destructive">
                  Lösenorden matchar inte.
                </p>
              )}
            </Field>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-card transition disabled:opacity-50"
          >
            {busy ? "Vänta…" : mode === "signin" ? "Logga in" : "Skapa konto"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === "signin" ? (
            <button
              onClick={() => {
                setMode("signup");
                setConfirmPassword("");
              }}
              className="text-primary underline"
            >
              Inget konto? Skapa här
            </button>
          ) : (
            <button
              onClick={() => {
                setMode("signin");
                setConfirmPassword("");
              }}
              className="text-primary underline"
            >
              Har du redan konto? Logga in
            </button>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/" className="underline">Tillbaka till hem</Link>
        </p>
      </main>
      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: var(--card);
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus { border-color: var(--ring); box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 20%, transparent); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
