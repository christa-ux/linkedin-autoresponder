export type AttachmentKind = 'image' | 'gif' | 'sticker' | 'file' | 'audio' | 'video';

export interface Attachment {
  kind: AttachmentKind;
  name?: string;
}

export interface LinkPreview {
  url: string;
  title?: string;
}

export interface ThreadMessage {
  /** LinkedIn event URN, else a content hash. */
  id: string;
  fromSelf: boolean;
  senderName: string;
  text: string;
  timeLabel: string;
  attachments: Attachment[];
  links: LinkPreview[];
}

export interface Thread {
  id: string;
  isGroup: boolean;
  isSponsored: boolean;
  otherName: string;
  messages: ThreadMessage[];
}

export interface ConversationSummary {
  index: number;
  /** Participant names. Memory only, never stored. */
  key: string;
  signature: string;
  unread: boolean;
  sponsored: boolean;
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
  language: string;
  text: string;
}
