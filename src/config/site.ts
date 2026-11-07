// Static site config. Shop name, contact and hero text live in the database
// (admin → Postavke); brand colours and fonts live in src/app/globals.css.

export const siteConfig = {
  /** Fallback when store_settings can't be read (e.g. during the first build). */
  defaultShopName: 'Moja trgovina',
  locale: 'hr-HR',
  currency: 'EUR',
  /**
   * Shows a notice in the footer that legal texts are templates.
   * Set to false once the shop owner has reviewed every legal page.
   */
  showLegalTemplateNotice: true,
  /** Products per page on listing pages. */
  pageSize: 12,
};
