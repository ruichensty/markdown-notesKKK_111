import {
  createContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  memo,
  useContext,
} from "react";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onClick?: () => void;
  children?: ContextMenuItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  minWidth?: number;
}

function ContextMenu({ x, y, items, onClose, minWidth = 180 }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [position, setPosition] = useState({ x, y });
  const [submenuPos, setSubmenuPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + rect.width > vw - 4) adjustedX = vw - rect.width - 4;
    if (y + rect.height > vh - 4) adjustedY = vh - rect.height - 4;
    if (adjustedX < 4) adjustedX = 4;
    if (adjustedY < 4) adjustedY = 4;

    if (adjustedX !== x || adjustedY !== y) {
      requestAnimationFrame(() => setPosition({ x: adjustedX, y: adjustedY }));
    }
  }, [x, y]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClick);
    });
    return () => {
      cancelAnimationFrame(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  const handleItemClick = useCallback(
    (item: ContextMenuItem) => {
      if (item.disabled) return;
      if (item.children) return;
      item.onClick?.();
      onClose();
    },
    [onClose]
  );

  const handleItemHover = useCallback((label: string, hasChildren: boolean) => {
    if (!hasChildren) {
      setActiveSubmenu(null);
      setSubmenuPos(null);
      return;
    }
    setActiveSubmenu(label);
    const el = menuRef.current?.querySelector(`[data-label="${label}"]`) as HTMLElement;
    if (el) {
      const rect = el.getBoundingClientRect();
      setSubmenuPos({ x: rect.right, y: rect.top });
    }
  }, []);

  return (
    <div className="context-menu-overlay" onClick={e => e.stopPropagation()}>
      <div
        ref={menuRef}
        className="context-menu context-menu--visible"
        style={{
          left: position.x,
          top: position.y,
          minWidth,
        }}
        onContextMenu={e => e.preventDefault()}
      >
        {items.map((item, i) =>
          item.separator ? (
            <div key={`sep-${i}`} className="context-menu-separator" />
          ) : (
            <div
              key={item.label}
              data-label={item.label}
              className={`context-menu-item ${
                item.danger ? "context-menu-item--danger" : ""
              } ${item.disabled ? "context-menu-item--disabled" : ""} ${
                activeSubmenu === item.label ? "context-menu-item--active" : ""
              }`}
              onClick={() => handleItemClick(item)}
              onMouseEnter={() => handleItemHover(item.label, !!item.children)}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              {item.icon && <span className="context-menu-item-icon">{item.icon}</span>}
              <span className="context-menu-item-label">{item.label}</span>
              {item.shortcut && <span className="context-menu-item-shortcut">{item.shortcut}</span>}
              {item.children && (
                <span className="context-menu-item-arrow">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </span>
              )}
            </div>
          )
        )}

        {activeSubmenu && submenuPos && (
          <div
            className="context-menu-submenu"
            style={{ left: submenuPos.x, top: submenuPos.y }}
            onMouseLeave={() => setActiveSubmenu(null)}
          >
            {items
              .find(it => it.label === activeSubmenu)
              ?.children?.map(sub => (
                <div
                  key={sub.label}
                  className={`context-menu-item ${
                    sub.danger ? "context-menu-item--danger" : ""
                  } ${sub.disabled ? "context-menu-item--disabled" : ""}`}
                  onClick={e => {
                    e.stopPropagation();
                    handleItemClick(sub);
                  }}
                >
                  {sub.icon && <span className="context-menu-item-icon">{sub.icon}</span>}
                  <span className="context-menu-item-label">{sub.label}</span>
                  {sub.shortcut && (
                    <span className="context-menu-item-shortcut">{sub.shortcut}</span>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export interface ContextMenuContextValue {
  show: (x: number, y: number, items: ContextMenuItem[]) => void;
  hide: () => void;
}

export const ContextMenuContext = createContext<ContextMenuContextValue>({
  show: () => {},
  hide: () => {},
});

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ContextMenuState | null>(null);

  const show = useCallback((x: number, y: number, items: ContextMenuItem[]) => {
    setState({ x, y, items });
  }, []);

  const hide = useCallback(() => {
    setState(null);
  }, []);

  return (
    <ContextMenuContext.Provider value={{ show, hide }}>
      {children}
      {state && <ContextMenu x={state.x} y={state.y} items={state.items} onClose={hide} />}
    </ContextMenuContext.Provider>
  );
}

export const useContextMenu = () => useContext(ContextMenuContext);

export default memo(ContextMenu);
