// The app's currently supported UI locales (apps/web/i18n/routing.ts) —
// vulgarization only ever targets this fixed, small set.
export const SUPPORTED_LOCALES = ['en', 'fr'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

// Matches apps/web/i18n/routing.ts's defaultLocale.
export const DEFAULT_LOCALE: Locale = 'fr';

export function parseLocale(value: unknown): Locale {
  return typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
    ? (value as Locale)
    : DEFAULT_LOCALE;
}
