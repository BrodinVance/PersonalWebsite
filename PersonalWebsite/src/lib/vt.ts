/**
 * CSS view-transition-name for a content entry. Must be a valid custom-ident
 * and unique per page; slugs can contain slashes (nested content), so
 * everything unsafe collapses to "-". The same name on a list title and a
 * detail-page h1 makes the title morph between pages.
 */
export function vtName(prefix: string, id: string): string {
  return `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}
