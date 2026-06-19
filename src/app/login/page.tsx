"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock1, Sms } from "iconsax-reactjs";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // If email confirmation is disabled, a session is created immediately.
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          toast.success("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push(redirect);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-bold tracking-tight">
            ThePlatform<span className="text-[var(--color-ash)]">.life</span> AI
          </h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Sign in to explore the 360° of Perspectives.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-7"
        >
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <div className="flex items-center gap-2 rounded-[14px] border border-[var(--color-line)] px-3 transition focus-within:border-[var(--color-graphite)]">
              <Sms size={18} color="#71717a" variant="Linear" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent py-2.5 text-sm outline-none"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <div className="flex items-center gap-2 rounded-[14px] border border-[var(--color-line)] px-3 transition focus-within:border-[var(--color-graphite)]">
              <Lock1 size={18} color="#71717a" variant="Linear" />
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent py-2.5 text-sm outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-sm font-semibold"
          >
            {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="font-semibold text-[var(--color-ink)] underline-offset-2 hover:underline"
          >
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
