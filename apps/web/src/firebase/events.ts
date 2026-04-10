import { logEvent } from "@firebase/analytics";
import { analytics } from "./client";

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!analytics) return;
  logEvent(analytics, name, params);
}

export function trackPageView(path: string) {
  trackEvent("page_view", { page_path: path });
}

export function trackPostView(slug: string, title: string) {
  trackEvent("post_view", { post_slug: slug, post_title: title });
}

export function trackOutboundClick(url: string) {
  trackEvent("outbound_click", { url });
}
