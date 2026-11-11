/**
 * Every LinkedIn selector lives here, so a DOM change is a one-file fix.
 * Each entry is a list tried in order (newest markup first, older fallbacks after).
 * Verified against the live page with `npm run inspect`, never guessed from memory alone.
 * Text-based matches assume the account's LinkedIn UI language is English.
 */
export const URLS = {
  feed: 'https://www.linkedin.com/feed/',
  me: 'https://www.linkedin.com/in/me/',
  login: 'https://www.linkedin.com/login',
  invitations: 'https://www.linkedin.com/mynetwork/invitation-manager/received/',
  messaging: 'https://www.linkedin.com/messaging/',
  thread: (id: string) => `https://www.linkedin.com/messaging/thread/${id}/`,
  /** A real existing thread. `/messaging/thread/new/` is the compose screen and must never be typed into. */
  existingThread: /\/messaging\/thread\/(?!new\/)([^/?#]+)/,
} as const;

/** Redirects that mean "not logged in / security check". Only a human can fix these. */
export const BLOCKED_URL = /linkedin\.com\/(?:login|checkpoint|authwall|uas\/|signup|m\/login)/;

export const SEL = {
  /** Profile page heading = our display name. */
  profileName: ['main h1', 'h1.text-heading-xlarge', 'h1'],

  // --- Invitations ---------------------------------------------------------
  /** Accept buttons; aria-label is usually "Accept <name>'s invitation". Matched by role + name. */
  acceptButtonName: /^accept\b/i,
  /** The invitation card around an Accept button (for a stable key and to skip non-people invites). */
  invitationCard: ['[data-view-name="pending-invitation"]', 'li.invitation-card'],  // ✓ live (data-view-name)
  /** Invites we do NOT accept (pages, events, newsletters, groups), matched on the button's aria-label only. */
  nonPersonInvite: /\b(follow|event|newsletter|group|attend)\b/i,

  // --- Messaging: conversation list ---------------------------------------
  conversationItem: ['li.msg-conversation-listitem', 'li.msg-conversations-container__convo-item', '[data-view-name="conversation-list-item"]'],
  conversationLink: ['a.msg-conversation-listitem__link', 'a[href*="/messaging/thread/"]'],
  conversationUnread: [
    '.msg-conversation-card__convo-item-container--unread',
    '.msg-conversation-card__unread-count',
    '.notification-badge--show',
  ],
  conversationPreview: ['.msg-conversation-card__message-snippet', '.msg-conversation-card__message-snippet-body'],
  conversationNames: ['.msg-conversation-listitem__participant-names', '.msg-conversation-card__participant-names'],
  /** Sponsored / InMail pills on a conversation card. */
  sponsoredLabel: /\b(sponsored|inmail)\b/i,

  // --- Messaging: open thread ---------------------------------------------
  messageList: ['.msg-s-message-list', '.msg-s-message-list-content'],
  messageEvent: ['li.msg-s-message-list__event', '.msg-s-message-list__event'],
  /** Inside an event: the item carrying data-event-urn. "--other" marks the other person's messages. */
  eventItem: ['.msg-s-event-listitem'],
  eventFromOtherClass: 'msg-s-event-listitem--other',
  eventBody: ['.msg-s-event-listitem__body', '.msg-s-event__content'],
  senderName: ['.msg-s-message-group__name', '.msg-s-message-group__profile-link'],
  timeLabel: ['.msg-s-message-group__timestamp', 'time'],
  image: ['img.msg-s-event-listitem__image', '.msg-s-event-listitem__image img', '.msg-s-event-listitem__image'],
  gif: ['.msg-s-event-listitem__gif', 'img[src*="giphy"]', 'img[src*=".gif"]'],
  file: ['.msg-s-event-listitem__attachment-item', '.ui-attachment', 'a[href*="/dms/"][download]'],
  fileName: ['.ui-attachment__filename', '.msg-s-event-listitem__attachment-name'],
  audio: ['audio', '.msg-s-event-listitem__audio'],
  video: ['video', '.msg-s-event-listitem__video'],
  linkPreview: ['.msg-s-event-listitem__link-preview', '.msg-s-event-listitem__unfurl', '.feed-shared-article'],
  linkPreviewTitle: ['.msg-s-event-listitem__link-preview-title', '.feed-shared-article__title', 'h3', 'h2'],
  threadHeaderNames: ['.msg-entity-lockup__entity-title', '.msg-thread__link-to-profile', '.msg-overlay-bubble-header__title'],

  // --- Composer ------------------------------------------------------------
  composer: ['div.msg-form__contenteditable[contenteditable="true"]', '[role="textbox"][contenteditable="true"]'],
  sendButton: ['button.msg-form__send-button', 'button[type="submit"].msg-form__send-btn'],
  sendButtonName: /^send$/i,

  // --- Modals that block clicks (upsells, "say hello", cookie banners) -----
  modalDismiss: [
    '.artdeco-modal button.artdeco-modal__dismiss',
    '[role="dialog"] button[aria-label="Dismiss"]',
    '[data-test-modal-close-btn]',
    'button[action-type="DENY"]',
  ],
} as const;

/** Join a fallback list into one CSS selector (first match wins in document order). */
export const any = (list: readonly string[]): string => list.join(', ');
