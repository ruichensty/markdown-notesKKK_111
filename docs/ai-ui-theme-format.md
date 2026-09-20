# AI 助手 UI 主题文件

在“设置 → AI 助手 → 机器人 UI 风格”中选择“导出制作模板”，编辑生成的 `.aiui.json` 文件后重新导入即可。

主题文件不会执行 JavaScript、HTML、CSS 或加载网络资源。系统只读取下列字段，其他字段会被忽略。

```json
{
  "format": "markdown-notes-ai-ui-theme",
  "version": 1,
  "name": "我的 AI 伙伴",
  "author": "你的名字",
  "description": "主题说明",
  "base": "companion",
  "tokens": {
    "accent": "#38d9ff",
    "accentSecondary": "#8b7cff",
    "surface": "#f5f8ff",
    "surfaceStrong": "#ffffff",
    "text": "#182033",
    "muted": "#667085",
    "border": "#cbd5e1",
    "botRadius": 22,
    "panelRadius": 18,
    "blur": 20,
    "shadow": 28,
    "density": 1,
    "motion": 1
  }
}
```

## 字段说明

| 字段          | 可用值                        |
| ------------- | ----------------------------- |
| `base`        | `companion`、`pet`、`minimal` |
| 颜色字段      | `#RRGGBB` 六位十六进制颜色    |
| `botRadius`   | 10–30                         |
| `panelRadius` | 8–30                          |
| `blur`        | 0–32                          |
| `shadow`      | 0–48                          |
| `density`     | 0.85–1.15                     |
| `motion`      | 0–1，`0` 为静止               |

主题文件最大 64 KB。自定义主题保存在当前浏览器的 IndexedDB 中，也会包含在应用全量备份里。
