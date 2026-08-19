import type { ThemeModeEnums } from "../../../shared/enums/theme/theme-mode.enum";
import type { UserSettingsEntity } from "../schemas/user-settings.schema";

export interface UpdateUserSettingsRequestDto {
  themeMode?: ThemeModeEnums;
  primaryColor?: string;
  languageCode?: string;
  timezone?: string;
  currencyCode?: string;
}

export type UpdateUserSettingsResponseDto = UserSettingsEntity;
