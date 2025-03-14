import { createRequestHandler } from "react-router";
import { runSession } from "session-context";
import { getLoadContext } from "./load-context";
import { BackupWorkflow } from "./workflows/backup-workflow";

export { BackupWorkflow };

const requestHandler = createRequestHandler(() =>
  import.meta.hot
    ? // @ts-ignore Virtual module provided by React Router at build time
      import("virtual:react-router/server-build").catch()
    : // @ts-ignore This file won't exist if it hasn't yet been built
      import("../build/server/index.js").catch(),
);

export default {
  async fetch(request, env, ctx) {
    return runSession(async () => {
      try {
        const loadContext = getLoadContext({
          request,
          context: {
            cloudflare: {
              ctx: {
                waitUntil: ctx.waitUntil.bind(ctx),
                passThroughOnException: ctx.passThroughOnException.bind(ctx),
              },
              cf: request.cf as never,
              caches,
              env,
            },
          },
        });
        return await requestHandler(request, loadContext);
      } catch (error) {
        console.log(error);
        return new Response("An unexpected error occurred", { status: 500 });
      }
    });
  },
  scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const params: Params = {
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      databaseId: env.CLOUDFLARE_DATABASE_ID,
    };
    ctx.waitUntil(
      (async () => {
        const instance = await env.BACKUP_WORKFLOW.create({ params });
        console.log(`Started workflow: ${instance.id}`);
      })(),
    );
  },
} satisfies ExportedHandler<Env>;
