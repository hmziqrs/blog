declare module "cloudflare:workers" {
  interface ProvidedEnv {
    DB: D1Database;
    RATE_LIMIT_KV: KVNamespace;
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
    NEWSLETTER_QUEUE: Queue<import("../src/modules/newsletter/queue").NewsletterMessage>;
    SEND_EMAIL: import("@cloudflare/workers-types").SendEmail;
    TURNSTILE_SECRET_KEY: string;
    NEWSLETTER_SEND_SECRET: string;
    EMAIL_FROM_ADDRESS: string;
    ALLOWED_ORIGIN: string;
    SITE_URL: string;
    ENVIRONMENT: string;
  }
}

declare module "cloudflare:test" {
  export const env: {
    DB: D1Database;
    RATE_LIMIT_KV: KVNamespace;
    TEST_MIGRATIONS: D1Migration[];
    NEWSLETTER_QUEUE: Queue<import("../src/modules/newsletter/queue").NewsletterMessage>;
    SEND_EMAIL: import("@cloudflare/workers-types").SendEmail;
    TURNSTILE_SECRET_KEY: string;
    NEWSLETTER_SEND_SECRET: string;
    EMAIL_FROM_ADDRESS: string;
    ALLOWED_ORIGIN: string;
    SITE_URL: string;
    ENVIRONMENT: string;
  };
  export function createExecutionContext(): ExecutionContext;
  export function createMessageBatch<T>(
    queueName: string,
    messages: T[],
  ): import("@cloudflare/workers-types").MessageBatch<T>;
  export function getQueueResult<T>(
    batch: import("@cloudflare/workers-types").MessageBatch<T>,
    ctx: ExecutionContext,
  ): Promise<{
    explicitAcks: string[];
    retryMessages: { msgId: string }[];
    ackAll: boolean;
    retryBatch: { retry: boolean };
  }>;
  export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;
  export function applyD1Migrations(db: D1Database, migrations: D1Migration[]): Promise<void>;
  export type D1Migration = { name: string; content: string };

  interface ProvidedEnv {
    DB: D1Database;
    RATE_LIMIT_KV: KVNamespace;
    TEST_MIGRATIONS: D1Migration[];
    NEWSLETTER_QUEUE: Queue<import("../src/modules/newsletter/queue").NewsletterMessage>;
    SEND_EMAIL: import("@cloudflare/workers-types").SendEmail;
    TURNSTILE_SECRET_KEY: string;
    NEWSLETTER_SEND_SECRET: string;
    EMAIL_FROM_ADDRESS: string;
    ALLOWED_ORIGIN: string;
    SITE_URL: string;
    ENVIRONMENT: string;
  }
}
