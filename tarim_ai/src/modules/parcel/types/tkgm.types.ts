/**
 * TKGM CBS API response shapes are unofficial and may change without notice.
 * Field names below reflect commonly observed MegsisWebApi / Parsel Sorgu payloads.
 */
export interface TkgmGeometry {
  type?: string;
  coordinates?: unknown;
}

export interface TkgmParcelProperties {
  ilAd?: string;
  ilceAd?: string;
  mahalleAd?: string;
  mahalleId?: number | string;
  adaNo?: string | number;
  parselNo?: string | number;
  nitelik?: string;
  alan?: string | number;
  pafta?: string;
  ozet?: string;
  [key: string]: unknown;
}

export interface TkgmParcelFeature {
  type?: string;
  geometry?: TkgmGeometry | null;
  properties?: TkgmParcelProperties | null;
}

export interface TkgmAdministrativeItem {
  id?: number | string;
  text?: string;
  name?: string;
  ad?: string;
  value?: string | number;
  [key: string]: unknown;
}
