import { createRequestHandler } from "react-router";
import { adapterContext } from "~/lib/contexts";

// D1 backup workflow, if you want to use it, please delete the commented code about BackupWorkflow.
// Also, you need to add the related configuration and binding in wragnler.jsonc.
// import { BackupWorkflow } from "./workflows/backup-workflow";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
  export interface Future {
    unstable_viteEnvironmentApi: true;
    unstable_middleware: true;
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

// Backup workflow
// export { BackupWorkflow };

export default {
  async fetch(request, env, ctx) {
    const contextValue = {
      cloudflare: {
        env,
        ctx,
      },
    };
    const context = new Map([[adapterContext, contextValue]]);
    return requestHandler(request, context);
  },
  // Backup workflow scheduled
  // scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
  //   const params: Params = {
  //     accountId: env.CLOUDFLARE_ACCOUNT_ID,
  //     databaseId: env.CLOUDFLARE_DATABASE_ID,
  //   };
  //   ctx.waitUntil(
  //     (async () => {
  //       const instance = await env.BACKUP_WORKFLOW.create({ params });
  //       console.log(`Started workflow: ${instance.id}`);
  //     })(),
  //   );
  // },
} satisfies ExportedHandler<Env>;
