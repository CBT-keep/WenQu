import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/page'
import { Seg } from '@/components/ui/seg'
import { UsersPanel } from './users-panel'
import { ModelsPanel } from './models-panel'
import { ParametersPanel } from './parameters-panel'
import { LogsPanel } from './logs-panel'

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
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <PageHeader title="设置" description="账号、模型、系统参数与审计日志" />

        <Seg
          className="mb-4"
          value={tab}
          onChange={(next) => setParams(next === 'users' ? {} : { tab: next })}
          options={TABS.map((t) => ({ value: t.key, label: t.label }))}
        />

        {tab === 'users' && <UsersPanel />}
        {tab === 'models' && <ModelsPanel />}
        {tab === 'parameters' && <ParametersPanel />}
        {tab === 'logs' && <LogsPanel />}
      </div>
    </div>
  )
}
