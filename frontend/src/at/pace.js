// Pace: how long a person takes per quiz question, timed quietly (no countdown, and they can switch it off).
// It is measured on this device, kept in memory only, never sent, and NOT used to rank tools:
// the simulated class has no pace number yet, so there is nothing to match it against.
// A pace is { median: seconds per answered quiz question, count: how many questions were timed } or null.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
// Wedge size on the stat wheel: 5 seconds or less fills it, 45 seconds or more leaves it almost empty.
export const paceValue = (pace) => (pace?.count ? clamp(1 - (pace.median - 5) / 40, 0, 1) : null)
export const paceText = (pace) => (pace?.count ? `${Math.round(pace.median)} s a question` : 'not timed')
export const median = (xs) => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0 }
