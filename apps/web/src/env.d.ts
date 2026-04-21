/// <reference types="astro/client" />

interface Env {
  DB: import("@cloudflare/workers-types").D1Database;
  TURNSTILE_SECRET_KEY: string;
  SEND_EMAIL: import("@cloudflare/workers-types").SendEmail;
  EMAIL_FROM_ADDRESS: string;
  NEWSLETTER_SEND_SECRET: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
