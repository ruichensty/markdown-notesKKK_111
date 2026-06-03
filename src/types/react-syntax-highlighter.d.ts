declare module "react-syntax-highlighter/dist/esm/prism-light" {
  import type { ComponentType } from "react";

  const SyntaxHighlighter: ComponentType<Record<string, unknown>> & {
    registerLanguage: (name: string, language: unknown) => void;
  };

  export default SyntaxHighlighter;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  export const vscDarkPlus: Record<string, unknown>;
  export const vs: Record<string, unknown>;
}

declare module "react-syntax-highlighter/dist/esm/languages/prism/*" {
  const language: unknown;
  export default language;
}
