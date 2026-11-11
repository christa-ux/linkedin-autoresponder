export type AttachmentKind = 'image' | 'gif' | 'sticker' | 'file' | 'audio' | 'video';

export interface Attachment {
  kind: AttachmentKind;
  /** File name or alt text, if LinkedIn shows one. */
  name?: string;
  /** Position of the image in the thread, used to capture it for the vision model. */
  imageIndex?: number;
}

export interface LinkPreview {
  url: string;
  title?: string;
}

export interface ThreadMessage {
  /** Stable key: LinkedIn event URN when available, else a content hash. */
  id: string;
  fromSelf: boolean;
  senderName: string;
  text: string;
  /** Raw time label as shown by LinkedIn (e.g. "10:42 AM"); used only for keys/ordering hints. */
  timeLabel: string;
  attachments: Attachment[];
  links: LinkPreview[];
}

export interface Thread {
  /** Thread id from the /messaging/thread/<id>/ URL. */
  id: string;
  isGroup: boolean;
  /** Sponsored / InMail / system threads are never answered. */
  isSponsored: boolean;
  otherName: string;
  messages: ThreadMessage[];
}

export interface ConversationSummary {
  threadId: string;
  unread: boolean;
  /** Short preview text of the last message, used as a cheap change signal. */
  preview: string;
}

export type Tag =
  | 'nearly_empty'
  | 'emoji_only'
  | 'long'
  | 'multi'
  | 'repeated'
  | 'link'
  | 'file'
  | 'image'
  | 'gif'
  | 'audio'
  | 'video'
  | 'non_english'
  | 'rude'
  | 'injection'
  | 'bot_question'
  | 'contact_request'
  | 'meeting_request'
  | 'thanks_bye'
  | 'all_caps'
  | 'code';

export interface Classification {
  tags: Set<Tag>;
  /** Cheap language guess (ISO-ish code), only a hint for the LLM and fallbacks. */
  language: string;
  text: string;
}
