import { analysisRouter } from "./routers/analysis";
import { subscriptionRouter } from "./routers/subscription";
import { userRouter } from "./routers/user";
import { router } from "./trpc";

export const appRouter = router({
  analysis: analysisRouter,
  subscription: subscriptionRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
