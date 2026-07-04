export type MessageDirection = 'incoming' | 'outgoing';

export interface MessageLogRow {
  id: string;
  user_id: string | null;
  phone_number: string;
  direction: MessageDirection;
  message_text: string;
  created_at: string; // ISO-8601 timestamptz
}

export interface MessageLogInsert {
  user_id?: string | null;
  phone_number: string;
  direction: MessageDirection;
  message_text: string;
}
