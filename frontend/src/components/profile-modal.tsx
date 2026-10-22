import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Alert } from '@/components/ui/feedback'
import { useAuthStore } from '@/stores/auth'
import { updateProfile } from '@/api/auth'
import { toApiError } from '@/lib/http'
import { btnPrimary, btnGhost } from '@/lib/styles'

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const mutation = useMutation({
    mutationFn: () => updateProfile({ nickname, email }),
    onSuccess: (saved) => { setUser(saved); onClose() },
  })
  return <Modal open onClose={onClose} title="个人资料" footer={<>
    <button className={btnGhost} onClick={() => { onClose(); navigate('/change-password') }}>修改密码</button>
    <button type="submit" form="profile-form" className={btnPrimary} disabled={mutation.isPending}>保存</button>
  </>}>
    <form id="profile-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <Field label="昵称"><Input maxLength={64} value={nickname} onChange={(e) => setNickname(e.target.value)} /></Field>
      <Field label="邮箱"><Input type="email" maxLength={128} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      {mutation.error && <Alert tone="error">{toApiError(mutation.error).message}</Alert>}
    </form>
  </Modal>
}
