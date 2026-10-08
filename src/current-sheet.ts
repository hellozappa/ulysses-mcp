// Shortcuts invocation is intentionally unavailable. Do not introduce an app,
// clipboard, or Accessibility fallback without a separately authorized route.
export const CURRENT_SHEET_UNAVAILABLE_REASON = "Current-sheet detection is unavailable: no supported direct API route has been verified. Shortcuts-based detection is disabled; Shortcuts must not be launched.";

export function unavailableCurrentSheet() {
  return { identifier: null, callback_url: null, source: null, status: "unavailable", reason: CURRENT_SHEET_UNAVAILABLE_REASON };
}
