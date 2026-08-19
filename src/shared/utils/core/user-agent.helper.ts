const BROWSER_PATTERNS: [RegExp, string][] = [
  [/edg\//i, "Edge"],
  [/opr\/|opera/i, "Opera"],
  [/chrome|crios/i, "Chrome"],
  [/firefox|fxios/i, "Firefox"],
  [/safari/i, "Safari"],
];

const OS_PATTERNS: [RegExp, string][] = [
  [/windows/i, "Windows"],
  [/mac os x|macintosh/i, "macOS"],
  [/android/i, "Android"],
  [/iphone|ipad|ipod/i, "iOS"],
  [/linux/i, "Linux"],
];

function match(patterns: [RegExp, string][], userAgent: string): string | null {
  const found = patterns.find(([pattern]) => pattern.test(userAgent));
  return found ? found[1] : null;
}

export function parseDeviceName(userAgent?: string | null): string | undefined {
  if (!userAgent) return undefined;

  const browser = match(BROWSER_PATTERNS, userAgent);
  const os = match(OS_PATTERNS, userAgent);

  if (browser && os) return `${browser} on ${os}`;
  if (browser) return browser;
  if (os) return os;
  return "Unknown device";
}
