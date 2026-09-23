export interface BranchBrandingDto {
  /** Short-lived signed URL of the branch logo, or null when none is set. */
  logoUrl: string | null;
  primaryColor: string;
  languageCode: string;
  timezone: string;
}
