declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
    RATE_LIMIT_KV: KVNamespace;
    NEWSLETTER_QUEUE: Queue<import("../src/modules/newsletter/queue").NewsletterMessage>;
    TURNSTILE_SECRET_KEY: string;
    NEWSLETTER_SEND_SECRET: string;
    EMAIL_FROM_ADDRESS: string;
    ALLOWED_ORIGIN: string;
    SITE_URL: string;
    ENVIRONMENT: string;
  }
}
