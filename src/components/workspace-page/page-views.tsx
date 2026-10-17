import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTabs } from "./page-bar";

export function PageViews<T extends string>({
  items,
  value,
  onValueChange,
  className,
  panelId,
  "aria-label": label,
}: {
  items: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
  panelId: string;
  "aria-label": string;
}) {
  return (
    <PageTabs>
      <Tabs
        value={value}
        onValueChange={(next) => {
          const item = items.find(({ id }) => id === next);
          if (item) onValueChange(item.id);
        }}
        className={className}
      >
        <TabsList aria-label={label}>
          {items.map(({ id, label: text }) => (
            <TabsTrigger
              key={id}
              value={id}
              id={`${panelId}-${id}-tab`}
              aria-controls={panelId}
            >
              {text}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </PageTabs>
  );
}
