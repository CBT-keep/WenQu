/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端未就绪时置 1，登录走本地 mock（admin / admin@123） */
  readonly VITE_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
