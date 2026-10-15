/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Mock 开关：`all` / `none` / 逗号分隔的模块名（kb,chat,sqlbot,model,system）。
   * 解析逻辑见 src/lib/mock.ts。auth 与 users 已有真实后端，不参与。
   */
  readonly VITE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
