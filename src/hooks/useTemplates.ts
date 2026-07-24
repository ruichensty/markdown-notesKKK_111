import { useState, useCallback, useEffect } from "react";
import type { NoteTemplate } from "@types";
import { BUILTIN_TEMPLATES } from "@utils/template";
import { idbGetAllTemplates, idbSaveTemplate, idbDeleteTemplate } from "@utils/indexedDBStorage";

export function useTemplates() {
  const [templates, setTemplates] = useState<NoteTemplate[]>(BUILTIN_TEMPLATES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    idbGetAllTemplates()
      .then(custom => {
        if (custom && custom.length > 0) {
          setTemplates(prev => {
            const builtins = prev.filter(t => t.isBuiltin);
            return [...builtins, ...custom];
          });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const addTemplate = useCallback(
    (template: Omit<NoteTemplate, "id" | "isBuiltin" | "createdAt" | "updatedAt">) => {
      const now = Date.now();
      const newTemplate: NoteTemplate = {
        ...template,
        id: `custom-${now}-${Math.random().toString(36).slice(2, 8)}`,
        isBuiltin: false,
        createdAt: now,
        updatedAt: now,
      };
      setTemplates(prev => [...prev, newTemplate]);
      idbSaveTemplate(newTemplate).catch(() => {});
      return newTemplate;
    },
    []
  );

  const updateTemplate = useCallback(
    (id: string, data: Partial<Pick<NoteTemplate, "name" | "description" | "content">>) => {
      setTemplates(prev =>
        prev.map(t => (t.id === id ? { ...t, ...data, updatedAt: Date.now() } : t))
      );
      const target = templates.find(t => t.id === id);
      if (target && !target.isBuiltin) {
        idbSaveTemplate({ ...target, ...data, updatedAt: Date.now() }).catch(() => {});
      }
    },
    [templates]
  );

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    idbDeleteTemplate(id).catch(() => {});
  }, []);

  return { templates, loaded, addTemplate, updateTemplate, deleteTemplate };
}
