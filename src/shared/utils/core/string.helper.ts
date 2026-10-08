export function pluralizeByCount(
  count: number,
  singular: string,
  plural?: string,
): string {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${word}`;
}

/** "razak@example.com" becomes "r***k@example.com". */
export function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  const visibleEnd = name.length > 2 ? name.slice(-1) : "";
  return `${name.slice(0, 1)}***${visibleEnd}@${domain}`;
}

/** Keeps only the last four digits: "+919876543210" becomes "******3210". */
export function maskMobile(mobile: string): string {
  return `******${mobile.slice(-4)}`;
}
