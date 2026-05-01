import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings } from "./env";
import newsletter from "./modules/newsletter";

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGIN;
  if (allowed) {
    return cors({
      origin: allowed,
      allowMethods: ["GET", "POST", "OPTIONS"],
    })(c, next);
  }
  return next();
});

// M4/L9: Add security headers
app.use("/api/*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
});

app.route("/api/newsletter", newsletter);
app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
