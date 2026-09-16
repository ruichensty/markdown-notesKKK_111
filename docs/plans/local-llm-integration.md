# 本地大模型接入方案

## 背景

当前项目的 AI 助手主要通过云端 API 访问模型服务。现有实现位于：

- `src/utils/aiClient.ts`
- `src/hooks/useAiChat.ts`
- `src/components/AiAssistantWidget.tsx`
- `src/components/AiChatPanel.tsx`
- `src/components/SettingsPanel.tsx`

目前 AI 请求采用 OpenAI-compatible Chat Completions API 形式：

```ts
POST {baseUrl}/chat/completions
Authorization: Bearer xxx
body: {
  model,
  messages,
  stream: true
}
```

因此，只要本地大模型服务支持 OpenAI 兼容接口，就可以较低成本接入。

## 可接入的本地大模型工具

| 工具                          | 推荐程度 | 说明                                          |
| ----------------------------- | -------- | --------------------------------------------- |
| Ollama                        | 推荐     | 常见、易安装，支持 OpenAI compatible endpoint |
| LM Studio                     | 推荐     | 图形界面友好，通常支持 OpenAI-compatible API  |
| LocalAI                       | 可选     | 更偏服务端部署                                |
| vLLM                          | 可选     | 适合高性能推理服务                            |
| llama.cpp server              | 可选     | 可本地运行，需确认接口兼容性                  |
| Open WebUI / AnythingLLM 代理 | 可选     | 可作为中间层使用                              |

## 当前可行接入方式

如果本地模型服务支持 OpenAI-compatible API，理论上可以直接使用项目里的「自定义（OpenAI 兼容）」配置。

### Ollama 示例

```txt
baseURL: http://localhost:11434/v1
model: qwen2.5:7b
apiKey: local
```

### LM Studio 示例

```txt
baseURL: http://localhost:1234/v1
model: local-model
apiKey: local
```

其中 `apiKey` 对本地模型通常不是必需的，但当前项目代码仍要求填写。因此后续需要优化为：本地地址允许空 API Key。

## 主要风险：浏览器 CORS

当前项目是纯前端应用，AI 请求直接从浏览器发出。

如果本地模型服务没有开启 CORS，浏览器会阻止请求，出现类似问题：

```txt
CORS error
Network request failed
```

这不是模型能力问题，而是浏览器安全策略导致。

## CORS 解决方式

### 方案 A：本地服务开启 CORS

部分本地模型服务允许设置跨域来源。

例如 Ollama 可通过环境变量配置：

```bash
OLLAMA_ORIGINS=*
```

或指定前端地址：

```txt
http://localhost:3000
```

优点：不需要额外服务，前端可直接调用本地模型。

缺点：依赖本地模型工具是否支持 CORS，用户需要手动配置。

### 方案 B：本地代理

架构如下：

```txt
Frontend -> Local Proxy -> Local LLM
```

例如：

```txt
http://localhost:3000
  -> /api/local-ai/chat/completions
  -> http://localhost:11434/v1/chat/completions
```

优点：避免浏览器 CORS，可统一不同本地模型协议，可隐藏或统一 API Key，可支持 Ollama 原生 `/api/chat`。

缺点：需要额外启动一个本地服务，项目运行方式变复杂。

### 方案 C：Tauri / 桌面端集成

如果后续项目桌面化，可以通过 Tauri 后端访问本地模型：

```txt
React UI -> Tauri Command -> Local Model Service
```

优点：无浏览器 CORS 限制，可检测本地模型服务是否启动，可直接调用本地命令。

缺点：工程复杂度更高，不适合第一阶段。

## 推荐路线

建议分阶段实现。

## Phase 1：前端直接支持本地 OpenAI-compatible 服务

### 目标

让 Ollama / LM Studio 等本地服务可以通过现有 AI 设置直接使用。

### 改动内容

#### 1. 扩展 Provider 类型

修改：

```txt
src/types/ai.ts
```

当前：

```ts
export type AiProviderId = "zhipu" | "deepseek" | "moonshot" | "openai" | "custom";
```

建议改为：

```ts
export type AiProviderId =
  "zhipu" | "deepseek" | "moonshot" | "openai" | "ollama" | "lmstudio" | "custom";
```

#### 2. 新增本地模型预设

修改：

```txt
src/utils/aiClient.ts
```

新增 provider：

```ts
{
  id: "ollama",
  label: "Ollama 本地",
  baseUrl: "http://localhost:11434/v1",
  model: "qwen2.5:7b",
  keyUrl: "",
}

{
  id: "lmstudio",
  label: "LM Studio 本地",
  baseUrl: "http://localhost:1234/v1",
  model: "local-model",
  keyUrl: "",
}
```

#### 3. 本地地址允许空 API Key

当前逻辑：

```ts
if (!apiKey.trim()) {
  throw new AiClientError("noKey", "尚未配置 API Key，请在设置中填写");
}
```

建议新增判断函数：

```ts
function isLocalBaseUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  } catch {
    return false;
  }
}
```

然后改为：

```ts
const local = isLocalBaseUrl(baseUrl);

if (!apiKey.trim() && !local) {
  throw new AiClientError("noKey", "尚未配置 API Key，请在设置中填写");
}
```

请求头改为：

```ts
headers: {
  "Content-Type": "application/json",
  ...(apiKey.trim() ? { Authorization: `Bearer ${apiKey}` } : {}),
}
```

这样本地模型可以不填 API Key。

#### 4. 优化本地连接错误提示

当前 `TypeError` 会被归类为 CORS/network：

```txt
网络请求失败：可能是跨域（CORS）限制或断网...
```

建议对本地地址给更明确提示：

```txt
本地模型服务连接失败：请确认服务已启动，并允许浏览器跨域访问（CORS）。
```

#### 5. 设置面板文案优化

修改：

```txt
src/components/SettingsPanel.tsx
```

当 provider 是 `ollama` 或 `lmstudio` 时：

- API Key 输入框显示为可选
- 提示文案改为：

```txt
本地模型通常无需 API Key。如连接失败，请确认本地服务已启动并开启 CORS。
```

### Phase 1 验证

#### Ollama

启动 Ollama：

```bash
ollama serve
```

拉取模型：

```bash
ollama pull qwen2.5:7b
```

项目设置：

```txt
服务商：Ollama 本地
baseURL：http://localhost:11434/v1
model：qwen2.5:7b
apiKey：留空或 local
```

发送消息，确认流式回复正常。

#### LM Studio

启动 LM Studio 本地服务，设置：

```txt
服务商：LM Studio 本地
baseURL：http://localhost:1234/v1
model：local-model
apiKey：留空或 local
```

发送消息，确认流式回复正常。

## Phase 2：连接测试与模型列表

### 目标

降低用户配置成本。

### 新增能力

在设置面板增加：

```txt
测试连接
```

请求：

```txt
GET {baseUrl}/models
```

如果成功，展示模型列表。

### 示例返回

OpenAI-compatible `/models` 通常返回：

```json
{
  "data": [{ "id": "qwen2.5:7b" }, { "id": "llama3.1:8b" }]
}
```

可用于生成模型下拉选择。

### 需要新增函数

```ts
fetchAiModels(baseUrl: string, apiKey?: string): Promise<string[]>
```

错误提示：

- 服务未启动
- CORS 被拦截
- `/models` 不支持
- 返回格式不兼容

## Phase 3：本地代理

如果用户反馈 CORS 问题较多，可以新增本地代理。

### 方案

新增一个轻量 Node 服务：

```txt
server/local-ai-proxy.ts
```

前端请求：

```txt
http://localhost:xxxx/v1/chat/completions
```

代理转发到：

```txt
http://localhost:11434/v1/chat/completions
```

### 优点

- 避免 CORS
- 可兼容 Ollama 原生接口
- 可统一错误提示
- 可支持模型列表查询

### 缺点

- 需要额外启动服务
- 项目部署方式变复杂

## Phase 4：桌面端 / Tauri 集成

如果后续项目计划做桌面版，可以通过 Tauri 后端接入本地模型：

```txt
React -> Tauri command -> Ollama / LM Studio
```

### 优点

- 无浏览器 CORS 限制
- 可检测 Ollama 是否安装
- 可调用本地命令启动服务
- 更符合本地笔记应用形态

### 缺点

- 工程复杂度较高
- 需要桌面端构建和发布流程

## 推荐优先级

| 优先级 | 内容                         | 说明                 |
| ------ | ---------------------------- | -------------------- |
| P0     | 支持 Ollama / LM Studio 预设 | 改动小，收益高       |
| P0     | 本地地址允许空 API Key       | 本地模型必要能力     |
| P1     | 本地连接错误提示优化         | 降低排查成本         |
| P1     | 设置面板文案优化             | 避免用户困惑         |
| P2     | 测试连接 / 模型列表          | 提升易用性           |
| P3     | 本地代理 / Tauri 后端        | 解决 CORS 与深度集成 |

## 第一版建议范围

第一版建议只做：

1. 新增 `ollama` / `lmstudio` provider
2. 本地地址允许空 API Key
3. 本地连接失败提示优化
4. 设置面板提示本地模型无需 API Key

暂不做：

- 本地代理
- 模型列表
- Ollama 原生 `/api/chat`
- 自动启动模型服务
- Tauri 集成

这样可以保持纯前端架构，同时快速验证本地大模型接入效果。

## 结论

本项目接入本地大模型非常可行。

由于当前 AI 客户端已经采用 OpenAI-compatible Chat Completions 接口，Ollama、LM Studio、LocalAI、vLLM 等本地服务都可以较低成本接入。

最推荐的第一步是：

```txt
支持 Ollama + LM Studio 预设
允许本地地址空 API Key
优化本地连接错误提示
```

后续再根据实际使用情况决定是否加入模型列表、本地代理或桌面端集成。
