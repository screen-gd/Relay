import type { ReactNode } from "react";

/**
 * Centered title block at the top of each inner page, matching the home
 * hero. Optional `children` render below the description (e.g. actions).
 * Static: only the sections below it animate. Styled by `.page-header` in
 * globals.css.
 */
export default function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="container page-header-body">
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </div>
    </header>
  );
}
