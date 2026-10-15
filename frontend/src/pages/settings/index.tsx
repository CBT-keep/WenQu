import { useSearchParams } from 'react-router-dom'
import { UsersPanel } from './users-panel'
import { ModelsPanel } from './models-panel'
import { ParametersPanel } from './parameters-panel'
import { LogsPanel } from './logs-panel'
import { cn } from '@/lib/utils'

type SettingsTab = 'users' | 'models' | 'parameters' | 'logs'

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'users', label: '用户管理' },
  { key: 'models', label: '模型配置' },
  { key: 'parameters', label: '系统参数' },
  { key: 'logs', label: '操作日志' },
]

/** 设置页：用户 / 模型 / 系统参数 / 操作日志。tab 落在 URL 上（?tab=），可分享可刷新。 */
export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: SettingsTab = (TABS.find((t) => t.key === raw)?.key ?? 'users') as SettingsTab

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 flex-none items-center border-b border-line px-6">
        <div>
          <h1 className="text-[17px] font-medium">设置</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">账号、模型、系统参数与审计日志</p>
        </div>
      </header>

      <div className="flex flex-none gap-1 border-b border-line px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={cn(
              '-mb-px cursor-pointer border-b-2 px-3 py-2.5 text-[14.5px] transition-colors',
              tab === t.key ? 'border-accent font-medium text-ink' : 'border-transparent text-ink-3 hover:text-ink',
            )}
            onClick={() => setParams(t.key === 'users' ? {} : { tab: t.key })}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-[1080px]">
          {tab === 'users' && <UsersPanel />}
          {tab === 'models' && <ModelsPanel />}
          {tab === 'parameters' && <ParametersPanel />}
          {tab === 'logs' && <LogsPanel />}
        </div>
      </div>
    </div>
  )
}
