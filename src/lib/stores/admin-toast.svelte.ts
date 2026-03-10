import { SvelteMap } from 'svelte/reactivity';

export type ToastType = 'success' | 'error' | 'neutral';

export type ToastEntry = {
  id: number;
  message: string;
  type: ToastType;
  sticky: boolean;
  durationMs: number;
  createdAt: number;
};

type PushToastInput = {
  message: string;
  type?: ToastType;
  source?: string;
};

const MAX_VISIBLE_TOASTS = 3;
const AUTO_DISMISS_MS = 4500;
const SOURCE_DEDUPE_WINDOW_MS = 300;

export const adminToastEntries = $state<ToastEntry[]>([]);

let nextToastId = 1;
const dismissTimers = new SvelteMap<number, ReturnType<typeof setTimeout>>();
const recentSourceSignatures = new SvelteMap<
  string,
  { signature: string; at: number }
>();

const clearDismissTimer = (toastId: number) => {
  const timer = dismissTimers.get(toastId);
  if (timer == null) return;
  clearTimeout(timer);
  dismissTimers.delete(toastId);
};

const buildSignature = (type: ToastType, message: string) =>
  `${type}:${message}`;

const shouldEmitForSource = (source: string | undefined, signature: string) => {
  if (!source) return true;
  const now = Date.now();

  for (const [key, value] of recentSourceSignatures) {
    if (now - value.at > SOURCE_DEDUPE_WINDOW_MS) {
      recentSourceSignatures.delete(key);
    }
  }

  const previous = recentSourceSignatures.get(source);
  if (
    previous &&
    previous.signature === signature &&
    now - previous.at < SOURCE_DEDUPE_WINDOW_MS
  ) {
    return false;
  }

  recentSourceSignatures.set(source, { signature, at: now });
  return true;
};

const scheduleDismiss = (toast: ToastEntry) => {
  if (toast.sticky) return;
  const timer = setTimeout(() => {
    dismissAdminToast(toast.id);
  }, toast.durationMs);
  dismissTimers.set(toast.id, timer);
};

export const dismissAdminToast = (toastId: number) => {
  clearDismissTimer(toastId);
  const next = adminToastEntries.filter((entry) => entry.id !== toastId);
  adminToastEntries.splice(0, adminToastEntries.length, ...next);
};

export const pushAdminToast = (input: PushToastInput) => {
  const message = input.message.trim();
  if (!message) return null;

  const type = input.type ?? 'neutral';
  const signature = buildSignature(type, message);
  if (!shouldEmitForSource(input.source, signature)) return null;

  const toast: ToastEntry = {
    id: nextToastId++,
    message,
    type,
    sticky: type === 'error',
    durationMs: type === 'error' ? 0 : AUTO_DISMISS_MS,
    createdAt: Date.now(),
  };

  adminToastEntries.unshift(toast);
  if (adminToastEntries.length > MAX_VISIBLE_TOASTS) {
    const overflow = adminToastEntries.splice(MAX_VISIBLE_TOASTS);
    for (const droppedToast of overflow) {
      clearDismissTimer(droppedToast.id);
    }
  }

  scheduleDismiss(toast);
  return toast.id;
};
