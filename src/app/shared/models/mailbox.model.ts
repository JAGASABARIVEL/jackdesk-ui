export interface MailFolder {
  label: string;
  icon: string;
}

export interface Email {
  id: string;
  sender: string;
  subject: string;
  email_date: Date;
  body: string;
  replies: Email[]
}
