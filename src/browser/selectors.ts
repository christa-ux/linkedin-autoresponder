/** All LinkedIn selectors, checked with `npm run inspect`. Lists are tried in order; assumes an English UI. */
export const URLS = {
  feed: 'https://www.linkedin.com/feed/',
  me: 'https://www.linkedin.com/in/me/',
  login: 'https://www.linkedin.com/login',
  invitations: 'https://www.linkedin.com/mynetwork/invitation-manager/received/',
  messaging: 'https://www.linkedin.com/messaging/',
  thread: (id: string) => `https://www.linkedin.com/messaging/thread/${id}/`,
  /** `/thread/new/` is the compose screen: never type there. */
  existingThread: /\/messaging\/thread\/(?!new\/)([^/?#]+)/,
} as const;

export const BLOCKED_URL = /linkedin\.com\/(?:login|checkpoint|authwall|uas\/|signup|m\/login)/;

export const SEL = {
  profileName: ['main h1', 'h1.text-heading-xlarge', 'h1'],

  acceptButtonName: /^accept\b/i,
  invitationCard: ['[data-view-name="pending-invitation"]', 'li.invitation-card'],
  /** Pages, events, newsletters and groups are not accepted. */
  nonPersonInvite: /\b(follow|event|newsletter|group|attend)\b/i,

  // List items have no thread link: we click and read the id from the URL.
  conversationItem: ['li.msg-conversation-listitem', 'li.msg-conversations-container__convo-item'],
  conversationUnread: [
    '.msg-conversation-card__convo-item-container--unread',
    '.msg-conversation-card__unread-count',
    '.notification-badge--show',
  ],
  conversationPreview: ['.msg-conversation-card__message-snippet', '.msg-conversation-card__message-snippet-body'],
  conversationNames: ['.msg-conversation-listitem__participant-names', '.msg-conversation-card__participant-names'],
  sponsoredLabel: /\b(sponsored|inmail)\b/i,

  messageList: ['.msg-s-message-list', '.msg-s-message-list-content'],
  messageEvent: ['li.msg-s-message-list__event', '.msg-s-message-list__event'],
  eventItem: ['.msg-s-event-listitem'],
  eventFromOtherClass: 'msg-s-event-listitem--other',
  /** Not .msg-s-event__content: it also wraps images. */
  eventBody: ['.msg-s-event-listitem__body'],
  senderName: ['.msg-s-message-group__name', '.msg-s-message-group__profile-link'],
  timeLabel: ['.msg-s-message-group__timestamp', 'time'],
  image: ['img.msg-s-event-listitem__image', '.msg-s-event-listitem__image img'],
  gif: ['.msg-s-event-listitem__gif', 'img[src*="giphy"]', 'img[src*=".gif"]'],
  /** Also wraps images: it is a file only if it holds no <img>. */
  file: ['.msg-s-event-listitem__attachment-item', '.ui-attachment', 'a[href*="/dms/"][download]'],
  fileName: ['.ui-attachment__filename', '.msg-s-event-listitem__attachment-name'],
  audio: ['audio', '.msg-s-event-listitem__audio'],
  video: ['video', '.msg-s-event-listitem__video'],
  linkPreview: ['.msg-s-event-listitem__link-preview', '.msg-s-event-listitem__unfurl', '.feed-shared-article'],
  linkPreviewTitle: ['.msg-s-event-listitem__link-preview-title', '.feed-shared-article__title', 'h3', 'h2'],
  threadHeaderNames: ['.msg-entity-lockup__entity-title', '.msg-thread__link-to-profile', '.msg-overlay-bubble-header__title'],

  composer: ['div.msg-form__contenteditable[contenteditable="true"]', '[role="textbox"][contenteditable="true"]'],
  sendButton: ['button.msg-form__send-button', 'button[type="submit"].msg-form__send-btn'],
  sendButtonName: /^send$/i,

  modalDismiss: [
    '.artdeco-modal button.artdeco-modal__dismiss',
    '[role="dialog"] button[aria-label="Dismiss"]',
    '[data-test-modal-close-btn]',
    'button[action-type="DENY"]',
  ],
} as const;

export const any = (list: readonly string[]): string => list.join(', ');
