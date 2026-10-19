# Accessibility

Target WCAG 2.2 AA.

- Every page has one h1. `PageHeader` renders it for screen readers because the top bar shows the name visually.
- Landmarks: `aside` Sidebar, `nav` Primary navigation (or Settings navigation), the top bar's location `nav`, `main#main-content` with a skip link.
- Icon-only buttons carry `aria-label`; rail items name themselves in a tooltip and in their label.
- Focus is always visible: Quartz draws one ink outline; field components replace it with an ink edge and halo.
- Text roles reach 4.5:1 on every surface in both themes; `src/app/theme-contrast.test.ts` measures this from the token files.
- Status never relies on color alone: it is a word, and trouble adds warm color to that word.
- Keyboard: the sidebar, menus, tabs and lists work with Tab, arrows, Enter, Space and Escape; project lists move with arrows and open with Enter.
- Reduced motion removes every animation.
