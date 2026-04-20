/// <reference types="astro/client" />

interface Env {
  DB: import("@cloudflare/workers-types").D1Database;
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  EMAIL_FROM_ADDRESS: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
