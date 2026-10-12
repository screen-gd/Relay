import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { KanbanCard } from "./index";

vi.mock("@dnd-kit/core", () => ({
  useDraggable: ({ disabled }: { disabled: boolean }) => ({
    isDragging: !disabled,
    transform: { x: 140, y: 90 },
    setNodeRef: vi.fn(),
    attributes: {},
    listeners: undefined,
  }),
}));

test("dragging leaves the source card in its column for the floating preview", () => {
  const html = renderToStaticMarkup(
    <KanbanCard id="project" disabled={false}>
      {({ isDragging }) => (
        <span>{isDragging ? "Moving project" : "Project"}</span>
      )}
    </KanbanCard>
  );
  expect(html).toContain("Moving project");
  expect(html).not.toContain("translate3d");
});

test("read-only projects do not enter the dragging state", () => {
  const html = renderToStaticMarkup(
    <KanbanCard id="project" disabled>
      {({ isDragging }) => (
        <span>{isDragging ? "Moving project" : "Project"}</span>
      )}
    </KanbanCard>
  );
  expect(html).not.toContain("Moving project");
  expect(html).not.toContain("opacity-30");
});
