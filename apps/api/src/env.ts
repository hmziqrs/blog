import type { D1Database, SendEmail } from "@cloudflare/workers-types";

export type Bindings = {
  DB: D1Database;
  SEND_EMAIL: SendEmail;
  TURNSTILE_SECRET_KEY: string;
  NEWSLETTER_SEND_SECRET: string;
  EMAIL_FROM_ADDRESS: string;
  ENVIRONMENT: string;
  ALLOWED_ORIGIN: string;
};
