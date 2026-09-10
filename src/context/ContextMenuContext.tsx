import { createContext, useContext, type ReactNode } from "react";

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onClick?: () => void;
  children?: ContextMenuItem[];
}

export interface ContextMenuContextValue {
  show: (x: number, y: number, items: ContextMenuItem[]) => void;
  hide: () => void;
}

export const ContextMenuContext = createContext<ContextMenuContextValue>({
  show: () => {},
  hide: () => {},
});

export function useContextMenu() {
  return useContext(ContextMenuContext);
}
