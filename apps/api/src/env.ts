import type { D1Database, SendEmail } from "@cloudflare/workers-types";
import type { NewsletterMessage } from "./modules/newsletter/queue";

export type Bindings = {
  DB: D1Database;
  SEND_EMAIL: SendEmail;
  NEWSLETTER_QUEUE: Queue<NewsletterMessage>;
  TURNSTILE_SECRET_KEY: string;
  NEWSLETTER_SEND_SECRET: string;
  EMAIL_FROM_ADDRESS: string;
  ENVIRONMENT: string;
  ALLOWED_ORIGIN: string;
  SITE_URL: string;
};
