import { Hono } from "hono";
import type { Bindings } from "../../env";
import subscribe from "./routes/subscribe";
import unsubscribe from "./routes/unsubscribe";
import send from "./routes/send";

const newsletter = new Hono<{ Bindings: Bindings }>();
newsletter.route("/subscribe", subscribe);
newsletter.route("/unsubscribe", unsubscribe);
newsletter.route("/send", send);
export default newsletter;
