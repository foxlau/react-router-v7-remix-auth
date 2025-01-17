export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
}

export type SendEmailOptions = {
  apiKey: string;
  to: string | string[];
  template: EmailTemplate;
};

export type SendEmailResult = {
  status: "success" | "error";
  data?: unknown;
  message?: string;
};
