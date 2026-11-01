/** A tiny buzz on supported phones (Android). Does nothing elsewhere. */
export const tap = () => { try { navigator.vibrate?.(8); } catch { /* not supported */ } };
