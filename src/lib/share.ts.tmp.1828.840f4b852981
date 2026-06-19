/** Builds a shareable URL that auto-loads the analysis via ?scenario=. */
export function buildShareUrl(scenario: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "");
  const url = new URL(base || "http://localhost:3000");
  url.searchParams.set("scenario", scenario);
  return url.toString();
}
