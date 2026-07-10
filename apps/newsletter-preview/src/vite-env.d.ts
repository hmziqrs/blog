/// <reference types="vite/client" />

declare module "virtual:newsletters" {
  export const newsletters: Array<{ slug: string; content: string }>;
}
