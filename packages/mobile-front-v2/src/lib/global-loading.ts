type Listener = (visible: boolean) => void;

const listeners = new Set<Listener>();
let activeCount = 0;
let visible = false;
let delayTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let visibleSince = 0;
let suppressCount = 0;
let suppressed = false;

const MIN_VISIBLE_MS = 500;
const HIDE_DELAY_MS = 150;

const notify = () => {
  listeners.forEach((listener) => listener(visible));
};

const show = () => {
  if (suppressed) return;
  if (visible) return;
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  visible = true;
  visibleSince = Date.now();
  notify();
};

const hide = (force = false) => {
  if (!visible) return;
  if (force) {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    visible = false;
    notify();
    return;
  }
  if (hideTimer) return;
  const elapsed = Date.now() - visibleSince;
  const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
  const delay = Math.max(remaining, HIDE_DELAY_MS);
  hideTimer = setTimeout(() => {
    hideTimer = null;
    if (!visible) return;
    if (activeCount > 0 || suppressed) return;
    visible = false;
    notify();
  }, delay);
};

const setSuppressed = (value: boolean) => {
  suppressed = value;
  if (suppressed) {
    if (delayTimer) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    hide(true);
    return;
  }
  if (activeCount > 0) {
    delayTimer = setTimeout(() => {
      delayTimer = null;
      if (!suppressed && activeCount > 0) show();
    }, 200);
  }
};

export const subscribeGlobalLoading = (listener: Listener) => {
  listeners.add(listener);
  listener(visible);
  return () => listeners.delete(listener);
};

export const beginGlobalLoading = (delayMs = 400) => {
  activeCount += 1;

  if (activeCount === 1 && !suppressed) {
    if (delayTimer) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    delayTimer = setTimeout(() => {
      delayTimer = null;
      if (activeCount > 0) show();
    }, delayMs);
  }

  return () => endGlobalLoading();
};

export const endGlobalLoading = () => {
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount === 0) {
    if (delayTimer) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
    hide();
  }
};

export const suspendGlobalLoading = () => {
  suppressCount += 1;
  if (!suppressed) setSuppressed(true);
  return () => {
    suppressCount = Math.max(0, suppressCount - 1);
    if (suppressCount === 0) setSuppressed(false);
  };
};
