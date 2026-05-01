import app from "./app";
import type { Bindings } from "./env";
import type { NewsletterMessage } from "./modules/newsletter/queue";
import { handleQueueBatch } from "./modules/newsletter/queue-consumer";

export default {
  fetch: app.fetch,
  async queue(batch, env: Bindings, ctx: ExecutionContext) {
    return handleQueueBatch(batch as MessageBatch<NewsletterMessage>, env, ctx);
  },
} satisfies ExportedHandler<Bindings>;
