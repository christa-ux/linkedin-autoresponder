import type { Page } from 'playwright';
import type { ImageInput } from '../responder/llm.js';
import type { ConversationSummary, Thread } from '../types.js';
import { acceptPendingInvitations } from './invitations.js';
import * as messaging from './messaging.js';

/** No compose or connect methods: the bot can't write first. */
export interface LinkedInClient {
  acceptPendingInvitations(): Promise<string[]>;
  listConversations(): Promise<ConversationSummary[]>;
  openConversation(index: number): Promise<string>;
  readThread(sponsored?: boolean): Promise<Thread>;
  captureImages(thread: Thread, messageIds: string[]): Promise<ImageInput[]>;
  reply(threadId: string, text: string): Promise<void>;
}

export class PlaywrightClient implements LinkedInClient {
  constructor(
    private readonly invitesPage: Page,
    private readonly messagesPage: Page,
    private readonly maxTypingMs: number,
  ) {}

  acceptPendingInvitations() {
    return acceptPendingInvitations(this.invitesPage);
  }
  listConversations() {
    return messaging.listConversations(this.messagesPage);
  }
  openConversation(index: number) {
    return messaging.openConversation(this.messagesPage, index);
  }
  readThread(sponsored = false) {
    return messaging.readThread(this.messagesPage, sponsored);
  }
  captureImages(thread: Thread, ids: string[]) {
    return messaging.captureImages(this.messagesPage, thread, ids);
  }
  reply(threadId: string, text: string) {
    return messaging.reply(this.messagesPage, threadId, text, this.maxTypingMs);
  }
}
