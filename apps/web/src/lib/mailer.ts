export interface MailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(
  sendEmail: import("@cloudflare/workers-types").SendEmail,
  options: MailOptions,
): Promise<void> {
  await sendEmail.send({
    to: options.to,
    from: options.from,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
