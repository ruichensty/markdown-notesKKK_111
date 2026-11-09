import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { migrateFromLocalStorage } from "@utils/storage";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found!");
}

const root = createRoot(rootElement);

async function start() {
  try {
    await migrateFromLocalStorage();
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    console.error("Failed to migrate notes:", error);
    root.render(
      <div role="alert" style={{ padding: 24 }}>
        <p>无法读取旧笔记，已暂停启动以保护数据。</p>
        <button type="button" onClick={() => void start()}>
          重试
        </button>
      </div>
    );
  }
}

void start();
