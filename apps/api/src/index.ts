import { Hono } from "hono";
import type { Bindings } from "./env";
import newsletter from "./modules/newsletter";

const app = new Hono<{ Bindings: Bindings }>();
app.route("/api/newsletter", newsletter);
app.notFound((c) => c.json({ error: "Not found" }, 404));
export default app;
