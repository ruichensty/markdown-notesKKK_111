import { describe, it, expect } from "vitest";
import {
  validateBackup,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  encryptBackupFile,
  decryptBackupFile,
} from "../backup";

const validBackup = {
  format: "markdown-notes-backup",
  version: 1,
  exportedAt: 1700000000000,
  data: {
    notes: [],
    folders: [],
    settings: [],
    templates: [],
    aiChats: [],
    files: [],
  },
};

describe("validateBackup", () => {
  it("正常备份通过校验", () => {
    expect(() => validateBackup(validBackup)).not.toThrow();
    expect(validateBackup(validBackup).format).toBe("markdown-notes-backup");
  });

  it("非对象输入抛出错误", () => {
    expect(() => validateBackup(null)).toThrow();
    expect(() => validateBackup("string")).toThrow();
  });

  it("缺少 format 标识抛出错误", () => {
    expect(() => validateBackup({ version: 1, data: {} })).toThrow(/标识/);
  });

  it("缺少版本号抛出错误", () => {
    expect(() => validateBackup({ format: "markdown-notes-backup" })).toThrow(/版本/);
  });

  it("版本高于当前版本抛出错误", () => {
    expect(() => validateBackup({ ...validBackup, version: 3 })).toThrow(/更新版本/);
  });

  it("v1 备份自动补充空版本历史", () => {
    expect(validateBackup(validBackup).data.noteVersions).toEqual([]);
  });

  it("v2 备份缺少版本历史时拒绝导入", () => {
    expect(() =>
      validateBackup({
        format: "markdown-notes-backup",
        version: 2,
        exportedAt: 1700000000000,
        data: {
          notes: [],
          folders: [],
          settings: [],
          templates: [],
          aiChats: [],
          files: [],
        },
      })
    ).toThrow(/noteVersions/);
  });

  it("缺少数据字段抛出错误", () => {
    expect(() =>
      validateBackup({ ...validBackup, data: { ...validBackup.data, notes: undefined } })
    ).toThrow(/notes/);
  });

  it("附件数据损坏抛出错误", () => {
    expect(() =>
      validateBackup({
        ...validBackup,
        data: { ...validBackup.data, files: [{ id: "x", dataBase64: 123 }] },
      })
    ).toThrow(/附件/);
  });
});

describe("base64 编解码", () => {
  it("ArrayBuffer 与 base64 往返一致", () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 255, 254, 128]);
    const base64 = arrayBufferToBase64(bytes.buffer);
    const restored = base64ToArrayBuffer(base64);
    expect(new Uint8Array(restored)).toEqual(bytes);
  });

  it("空 buffer 往返为空", () => {
    const base64 = arrayBufferToBase64(new ArrayBuffer(0));
    const restored = base64ToArrayBuffer(base64);
    expect(restored.byteLength).toBe(0);
  });

  it("大于 0x8000 的 buffer 分块处理", () => {
    const size = 0x8000 + 100;
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i += 1) bytes[i] = i % 256;
    const base64 = arrayBufferToBase64(bytes.buffer);
    const restored = base64ToArrayBuffer(base64);
    expect(new Uint8Array(restored)).toEqual(bytes);
  });
});

describe("加密备份", () => {
  it("使用密码加密后可以完整解密", async () => {
    const backup = validateBackup(validBackup);
    const encrypted = await encryptBackupFile(backup, "correct-password");
    const restored = await decryptBackupFile(encrypted, "correct-password");
    expect(restored).toEqual(backup);
    expect(encrypted.cipher.dataBase64).not.toContain("markdown-notes-backup");
  });

  it("错误密码无法解密", async () => {
    const encrypted = await encryptBackupFile(validateBackup(validBackup), "correct-password");
    await expect(decryptBackupFile(encrypted, "wrong-password")).rejects.toThrow(/密码错误|损坏/);
  });

  it("篡改密文后认证失败", async () => {
    const encrypted = await encryptBackupFile(validateBackup(validBackup), "correct-password");
    const first = encrypted.cipher.dataBase64[0];
    const tampered = {
      ...encrypted,
      cipher: {
        ...encrypted.cipher,
        dataBase64: `${first === "A" ? "B" : "A"}${encrypted.cipher.dataBase64.slice(1)}`,
      },
    };
    await expect(decryptBackupFile(tampered, "correct-password")).rejects.toThrow(/密码错误|损坏/);
  });
});
