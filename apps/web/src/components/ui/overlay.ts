/**
 * Quartz overlay surfaces for the Radix layer. Every floating thing (menu,
 * select list, popover, dialog, sheet) is the raised surface with the frame
 * line and the one overlay shadow; it appears in 160ms and leaves in 120ms.
 */
export const overlaySurfaceClassName =
  "rounded-frame bg-raised text-text-1 shadow-overlay outline-none forced-colors:outline-1 forced-colors:outline-solid";

/** Menus and lists: the overlay surface with Quartz menu padding and motion. */
export const menuPopupClassName = `menu-popup z-50 ${overlaySurfaceClassName} animate-pop`;

/** One row in a menu or list. Pair with `data-variant` for destructive rows. */
export const menuItemClassName =
  "menu-item data-[inset]:ps-8 [&_svg:not([class*='size-'])]:size-4";

export const menuLabelClassName = "menu-label";

export const menuSeparatorClassName = "menu-separator";

/** Shortcut hint at the end of a menu row. */
export const menuShortcutClassName =
  "ms-auto ps-4 type-label-sm text-text-3 data";

/** Backdrop behind dialogs and modal sheets. */
export const backdropClassName =
  "fixed inset-0 z-50 bg-overlay data-[state=open]:animate-[relay-fade-in_var(--dur-slow)_var(--ease-step)_both] data-[state=closed]:animate-[relay-pop-out_var(--dur-base)_var(--ease-step)_both]";
