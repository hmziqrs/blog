export interface NewsletterMessage {
  issueSlug: string;
  subject: string;
  htmlBody: string;
  subscriberId: string;
  subscriberEmail: string;
  unsubscribeToken: string;
}
