import { useState } from "react";
import { useTemplates } from "@hooks/useTemplates";

interface TemplateManagementProps {
  onInsertTemplate: (templateId: string) => void;
}

export function TemplateManagement({ onInsertTemplate }: TemplateManagementProps) {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", content: "" });

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.content.trim()) return;
    const tpl = addTemplate(formData);
    setEditingId(tpl.id);
    setShowCreate(false);
    setFormData({ name: "", description: "", content: "" });
  };

  const handleEdit = (id: string) => {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    setFormData({ name: tpl.name, description: tpl.description, content: tpl.content });
    setEditingId(id);
    setShowCreate(false);
  };

  const handleSave = () => {
    if (!editingId) return;
    updateTemplate(editingId, formData);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteTemplate(id);
    if (editingId === id) setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowCreate(false);
    setFormData({ name: "", description: "", content: "" });
  };

  const currentTemplate = editingId ? templates.find(t => t.id === editingId) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          笔记模板
        </label>
        <button
          onClick={() => {
            setShowCreate(true);
            setEditingId(null);
            setFormData({ name: "", description: "", content: "" });
          }}
          className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
        >
          + 新建模板
        </button>
      </div>

      <div className="space-y-1.5">
        {templates.map(tpl => (
          <div
            key={tpl.id}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-foreground font-medium truncate">{tpl.name}</span>
                {tpl.isBuiltin && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                    内置
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground truncate block">
                {tpl.description}
              </span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onInsertTemplate(tpl.id)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                title="使用模板"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button
                onClick={() => handleEdit(tpl.id)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="编辑"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              {!tpl.isBuiltin && (
                <button
                  onClick={() => handleDelete(tpl.id)}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="删除"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {(showCreate || editingId) && (
        <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
          <input
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="模板名称"
            className="w-full px-2.5 py-1.5 text-xs bg-popover border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-colors"
          />
          <input
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="模板描述"
            className="w-full px-2.5 py-1.5 text-xs bg-popover border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-colors"
          />
          <textarea
            value={formData.content}
            onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="模板内容（支持 {{date}}, {{time}}, {{datetime}}, {{weekday}}, {{title}} 变量）"
            rows={8}
            className="w-full px-2.5 py-1.5 text-xs bg-popover border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-colors resize-y font-mono leading-relaxed"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="px-2.5 py-1 text-[10px] rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors font-medium"
            >
              取消
            </button>
            {editingId && !currentTemplate?.isBuiltin && (
              <button
                onClick={() => handleDelete(editingId)}
                className="px-2.5 py-1 text-[10px] rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
              >
                删除
              </button>
            )}
            <button
              onClick={
                editingId && showCreate ? handleCreate : editingId ? handleSave : handleCreate
              }
              className="px-2.5 py-1 text-[10px] rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              {showCreate && !editingId ? "创建" : "保存"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
