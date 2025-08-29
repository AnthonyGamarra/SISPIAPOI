export interface EmailRequest {
  to: string;
  subject: string;
  templateName: string;
  variables: { [key: string]: any };
}
