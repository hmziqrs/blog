import { Hono } from "hono";
import type { Bindings } from "./env";
import subscribe from "./routes/subscribe";
import unsubscribe from "./routes/unsubscribe";
import send from "./routes/send";

const app = new Hono<{ Bindings: Bindings }>();
app.route("/api/newsletter/subscribe", subscribe);
app.route("/api/newsletter/unsubscribe", unsubscribe);
app.route("/api/newsletter/send", send);
app.notFound((c) => c.json({ error: "Not found" }, 404));
export default app;
