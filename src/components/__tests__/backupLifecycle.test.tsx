import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), inspect: vi.fn(), restore: vi.fn(), inventory: vi.fn() }));
vi.mock("@utils/backup", () => ({
  createBackup: mocks.create, inspectBackup: mocks.inspect, restoreBackup: mocks.restore,
  getBackupInventory: mocks.inventory, BackupPasswordRequiredError: class extends Error {},
}));
vi.mock("../TemplateManagement", () => ({ TemplateManagement: () => null }));
vi.mock("../avatar/AvatarRenderer", () => ({ AvatarRenderer: () => null }));
import { SettingsPanel } from "../SettingsPanel";
import type { Settings } from "@hooks/useSettings";

const settings = { lineHeight: 1.7, ttsApiSpeed: 1, aiQuickPrompts: [], aiProvider: "zhipu", aiAvatarMode: "robot", aiUiStyle: "companion", aiTtsRate: 1, aiAvatarAnimation: "full" } as unknown as Settings;
function setup(flush = vi.fn().mockResolvedValue(undefined)) {
  const props = { settings, onClose: vi.fn(), onUpdate: vi.fn(), onBeforeDataReplace: flush };
  const view = render(<SettingsPanel {...props} isOpen={false} />);
  view.rerender(<SettingsPanel {...props} isOpen />);
  return view;
}
describe("backup lifecycle UI", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear();
    mocks.create.mockResolvedValue({ blob: new Blob(["backup"]), filename: "backup.json", byteSize: 6, noteCount: 2, fileCount: 1, versionCount: 0, encrypted: false });
    mocks.inventory.mockResolvedValue({ noteCount: 5, folderCount: 1, fileCount: 3, versionCount: 2, templateCount: 0, aiChatCount: 0 });
    mocks.inspect.mockResolvedValue({ noteCount: 2, fileCount: 1, exportedAt: 1, byteSize: 6, encrypted: false });
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:backup"), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  it("does not export when flushing current data fails", async () => {
    setup(vi.fn().mockRejectedValue(new Error("保存失败")));
    fireEvent.click(screen.getByText("导出普通备份"));
    expect(await screen.findByText("导出失败：保存失败")).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("records backup time only after confirming that the file was saved", async () => {
    setup(); fireEvent.click(screen.getByText("导出普通备份"));
    const confirm = await screen.findByText("确认备份文件已保存");
    expect(JSON.parse(localStorage.getItem("markdown-notes-backup-lifecycle")!).confirmedAt).toBeNull();
    fireEvent.click(confirm);
    expect(screen.queryByText(/最近确认备份：尚未/)).toBeNull();
    expect(JSON.parse(localStorage.getItem("markdown-notes-backup-lifecycle")!).confirmedAt).toBeGreaterThan(0);
  });
  it("does not record a backup or allow confirmation if download initiation fails", async () => {
    vi.mocked(HTMLAnchorElement.prototype.click).mockImplementationOnce(() => { throw new Error("下载被阻止"); });
    setup(); fireEvent.click(screen.getByText("导出普通备份"));
    expect(await screen.findByText("导出失败：下载被阻止")).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:backup");
    expect(document.querySelector('a[download="backup.json"]')).toBeNull();
    expect(screen.queryByText("确认备份文件已保存")).toBeNull();
    expect(JSON.parse(localStorage.getItem("markdown-notes-backup-lifecycle")!).confirmedAt).toBeNull();
  });
  it("rejects an invalid import before generating rollback or replacing data", async () => {
    mocks.inspect.mockRejectedValueOnce(new Error("备份损坏"));
    const view = setup();
    fireEvent.change(view.container.querySelector('input[accept="application/json,.json"]')!, { target: { files: [new File(["invalid"], "broken.json")] } });
    expect(await screen.findByText("无法读取备份：备份损坏")).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.restore).not.toHaveBeenCalled();
  });
  it("blocks replacing data when rollback generation fails", async () => {
    mocks.create.mockRejectedValueOnce(new Error("回滚备份失败"));
    const view = setup();
    fireEvent.change(view.container.querySelector('input[accept="application/json,.json"]')!, { target: { files: [new File(["{}"], "incoming.json")] } });
    fireEvent.click(await screen.findByText("下载回滚备份"));
    expect(await screen.findByText("导入失败：回滚备份失败")).toBeInTheDocument();
    expect(mocks.restore).not.toHaveBeenCalled();
    expect(screen.queryByText("确认回滚文件已保存，覆盖导入")).toBeNull();
  });
  it("does not import when cancelling after rollback download", async () => {
    const view = setup();
    fireEvent.change(view.container.querySelector('input[accept="application/json,.json"]')!, { target: { files: [new File(["{}"], "incoming.json")] } });
    fireEvent.click(await screen.findByText("下载回滚备份"));
    await screen.findByText("确认回滚文件已保存，覆盖导入");
    fireEvent.click(screen.getByText("取消"));
    expect(mocks.restore).not.toHaveBeenCalled();
    expect(screen.queryByText("确认回滚文件已保存，覆盖导入")).toBeNull();
  });
  it("blocks repeated exports while current data is being saved", async () => {
    let release!: () => void;
    const flush = vi.fn(() => new Promise<void>(resolve => { release = resolve; }));
    setup(flush);
    const button = screen.getByText("导出普通备份");
    fireEvent.click(button); fireEvent.click(button);
    expect(flush).toHaveBeenCalledOnce();
    expect(mocks.create).not.toHaveBeenCalled();
    await act(async () => release());
    await screen.findByText("确认备份文件已保存");
    expect(mocks.create).toHaveBeenCalledOnce();
  });
  it("downloads rollback first and never replaces data before the second confirmation", async () => {
    const view = setup();
    const input = view.container.querySelector('input[accept="application/json,.json"]')!;
    fireEvent.change(input, { target: { files: [new File(["{}"], "incoming.json")] } });
    fireEvent.click(await screen.findByText("下载回滚备份"));
    await screen.findByText("确认回滚文件已保存，覆盖导入");
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.restore).not.toHaveBeenCalled();
    mocks.restore.mockRejectedValueOnce(new Error("写入失败"));
    fireEvent.click(screen.getByText("确认回滚文件已保存，覆盖导入"));
    await waitFor(() => expect(mocks.restore).toHaveBeenCalledOnce());
    expect(await screen.findByText("导入失败：写入失败")).toBeInTheDocument();
  });
});
