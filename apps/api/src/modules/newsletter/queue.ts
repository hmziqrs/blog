export interface NewsletterMessage {
  postSlug: string;
  postTitle: string;
  postExcerpt: string;
  subscriberId: string;
  subscriberEmail: string;
  unsubscribeToken: string;
}
