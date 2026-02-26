import alchemy from "alchemy";
import { Astro } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });

const app = await alchemy("blog");

export const web = await Astro("web", {
  cwd: "../../apps/web",
});

console.log(`Web -> ${web.url}`);

await app.finalize();
