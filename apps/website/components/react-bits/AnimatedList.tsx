"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

type AnimatedListProps<Item> = {
  items: readonly Item[];
  selectedIndex: number;
  getKey: (item: Item) => string | number;
  renderItem: (item: Item, index: number, selected: boolean) => ReactNode;
  onItemSelect: (item: Item, index: number) => void;
  className?: string;
};

export default function AnimatedList<Item>({
  items,
  selectedIndex,
  getKey,
  renderItem,
  onItemSelect,
  className = "",
}: AnimatedListProps<Item>) {
  const listRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (selectedIndex < 0) return;
    const selected = listRef.current?.querySelector<HTMLElement>(
      `[data-list-index="${selectedIndex}"]`
    );
    selected?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  return (
    <div
      ref={listRef}
      className={className}
      role="list"
      onKeyDown={(event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const currentIndex = selectedIndex < 0 ? 0 : selectedIndex;
        const nextIndex = Math.min(
          items.length - 1,
          Math.max(0, currentIndex + direction)
        );
        const nextItem = items[nextIndex];
        if (nextItem) onItemSelect(nextItem, nextIndex);
      }}
    >
      {items.map((item, index) => (
        <motion.div
          key={getKey(item)}
          role="listitem"
          data-list-index={index}
          initial={reduceMotion ? false : { opacity: 0, x: 10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{
            duration: 0.2,
            delay: reduceMotion ? 0 : index * 0.035,
          }}
        >
          {renderItem(item, index, index === selectedIndex)}
        </motion.div>
      ))}
    </div>
  );
}
