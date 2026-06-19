import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/root";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    // The fetch adapter doesn't pass req/res, but our context reads cookies
    // via next/headers, so the empty factory call is fine.
    createContext: () => createContext(),
  });

export { handler as GET, handler as POST };
