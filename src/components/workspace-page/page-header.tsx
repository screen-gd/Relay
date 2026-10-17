import {
  useContext,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { PageBarContext } from "./page-bar";

type PageHeaderProps = Omit<ComponentPropsWithoutRef<"header">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

/** Keeps the page heading accessible and places its actions in the shared bar. */
export function PageHeader({
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  const { actionsHost } = useContext(PageBarContext);
  const content = actions ? (
    <div
      data-slot="page-header-actions"
      className="flex shrink-0 flex-wrap items-center justify-end gap-2"
    >
      {actions}
    </div>
  ) : null;
  return (
    <header data-slot="page-header" className="contents" {...props}>
      <h1 className="sr-only">{title}</h1>
      {description ? <div className="sr-only">{description}</div> : null}
      {actionsHost ? createPortal(content, actionsHost) : content}
    </header>
  );
}
