export interface IncomingMessage {
  externalId: string;

  inReplyTo: string | null;

  references: string[];

  subject: string;

  sender: string;

  recipients: string[];

  sentAt: Date;
}
