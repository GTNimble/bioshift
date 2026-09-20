import type { KeyboardEvent } from "react";

/** Props for keyboard-friendly clickable table rows / tiles. */
export function clickableRowProps(onOpen: () => void, label: string) {
  return {
    className: "cursor-pointer hover:bg-indigo-50/60",
    onClick: onOpen,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen();
      }
    },
    tabIndex: 0 as const,
    role: "button" as const,
    "aria-label": label,
  };
}
