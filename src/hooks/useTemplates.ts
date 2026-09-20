import { useState, useCallback, useEffect, useRef } from "react";
import type { NoteTemplate } from "@types";
import { BUILTIN_TEMPLATES } from "@utils/template";
import { idbGetAllTemplates, idbSaveTemplate, idbDeleteTemplate } from "@utils/indexedDBStorage";
import { publishCrossTabChange, subscribeCrossTabChange } from "@utils/crossTabSync";

export function useTemplates() {
  const [templates, setTemplates] = useState<NoteTemplate[]>(BUILTIN_TEMPLATES);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const retryOperationRef = useRef<(() => Promise<void>) | null>(null);

  const persist = useCallback((operation: () => Promise<void>) => {
    retryOperationRef.current = operation;
    setSaveError(null);
    operation()
      .then(() => {
        setSaveError(null);
        publishCrossTabChange("templates");
      })
      .catch(reason => {
        setSaveError(reason instanceof Error ? reason : new Error(String(reason)));
      });
  }, []);

  const reloadTemplates = useCallback(async () => {
    const custom = await idbGetAllTemplates();
    setTemplates(prev => {
      const builtins = prev.filter(template => template.isBuiltin);
      return [...builtins, ...(custom || [])];
    });
  }, []);

  useEffect(() => {
    idbGetAllTemplates()
      .then(custom => {
        setTemplates(prev => {
          const builtins = prev.filter(template => template.isBuiltin);
          return [...builtins, ...(custom || [])];
        });
        setLoaded(true);
      })
      .catch(reason => {
        setSaveError(reason instanceof Error ? reason : new Error(String(reason)));
        setLoaded(true);
      });
  }, []);

  useEffect(
    () =>
      subscribeCrossTabChange("templates", () => {
        void reloadTemplates().catch(reason => {
          setSaveError(reason instanceof Error ? reason : new Error(String(reason)));
        });
      }),
    [reloadTemplates]
  );

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
      persist(() => idbSaveTemplate(newTemplate));
      return newTemplate;
    },
    [persist]
  );

  const updateTemplate = useCallback(
    (id: string, data: Partial<Pick<NoteTemplate, "name" | "description" | "content">>) => {
      setTemplates(prev =>
        prev.map(t => (t.id === id ? { ...t, ...data, updatedAt: Date.now() } : t))
      );
      const target = templates.find(t => t.id === id);
      if (target && !target.isBuiltin) {
        const next = { ...target, ...data, updatedAt: Date.now() };
        persist(() => idbSaveTemplate(next));
      }
    },
    [persist, templates]
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      setTemplates(prev => prev.filter(t => t.id !== id));
      persist(() => idbDeleteTemplate(id));
    },
    [persist]
  );

  const retrySave = useCallback(() => {
    const operation = retryOperationRef.current;
    if (operation) persist(operation);
  }, [persist]);

  const clearSaveError = useCallback(() => setSaveError(null), []);

  return {
    templates,
    loaded,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    saveError,
    retrySave,
    clearSaveError,
  };
}
