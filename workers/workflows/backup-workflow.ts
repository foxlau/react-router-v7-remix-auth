/*
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";

// Workflow parameters: we expect accountId and databaseId
type Params = {
  accountId: string;
  databaseId: string;
};

// D1 API response types
interface D1ExportResponse {
  result: {
    at_bookmark?: string;
    signed_url?: string;
    filename?: string;
  };
  success: boolean;
  errors: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
}

// Workflow logic
export class BackupWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { accountId, databaseId } = event.payload;

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/export`;
    const method = "POST";
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Authorization", `Bearer ${this.env.D1_REST_API_TOKEN}`);

    const bookmark = await step.do(
      `Starting backup for ${databaseId}`,
      async () => {
        const payload = { output_format: "polling" };

        const res = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(payload),
        });
        const { result } = (await res.json()) as D1ExportResponse;

        // If we don't get `at_bookmark` we throw to retry the step
        if (!result?.at_bookmark) throw new Error("Missing `at_bookmark`");

        return result.at_bookmark;
      },
    );

    await step.do("Check backup status and store it on R2", async () => {
      const payload = { current_bookmark: bookmark };

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });
      const { result } = (await res.json()) as D1ExportResponse;

      // The endpoint sends `signed_url` when the backup is ready to download.
      // If we don't get `signed_url` we throw to retry the step.
      if (!result?.signed_url) throw new Error("Missing `signed_url`");

      const dumpResponse = await fetch(result.signed_url);
      if (!dumpResponse.ok) throw new Error("Failed to fetch dump file");

      // Finally, stream the file directly to R2
      if (!result.filename) throw new Error("Missing filename");
      await this.env.BACKUP_BUCKET.put(result.filename, dumpResponse.body);
    });
  }
}
*/
