type Listener = (visible: boolean) => void;

const listeners = new Set<Listener>();
let activeCount = 0;
let visible = false;
let delayTimer: ReturnType<typeof setTimeout> | null = null;
let suppressCount = 0;
let suppressed = false;

const notify = () => {
  listeners.forEach((listener) => listener(visible));
};

const show = () => {
  if (suppressed) return;
  if (visible) return;
  visible = true;
  notify();
};

const hide = () => {
  if (!visible) return;
  visible = false;
  notify();
};

const setSuppressed = (value: boolean) => {
  suppressed = value;
  if (suppressed) {
    if (delayTimer) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
    hide();
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
