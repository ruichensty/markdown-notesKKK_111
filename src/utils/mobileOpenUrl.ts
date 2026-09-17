export type SharedViewMode = "home" | "editor" | "preview" | "split";

export function getSharedViewMode(value: string | null): SharedViewMode | null {
  if (value === "home" || value === "editor" || value === "preview" || value === "split") {
    return value;
  }
  return null;
}

export function buildMobileOpenUrl(
  href: string,
  noteId: string | null,
  viewMode: SharedViewMode
): string {
  const url = new URL(href);
  if (noteId) {
    url.searchParams.set("note", noteId);
    url.searchParams.set("view", viewMode === "home" ? "split" : viewMode);
  } else {
    url.searchParams.delete("note");
    url.searchParams.set("view", "home");
  }
  return url.toString();
}

export function getMobileViewMode(viewMode: SharedViewMode | null): SharedViewMode {
  return viewMode === "preview" ? "preview" : "editor";
}
