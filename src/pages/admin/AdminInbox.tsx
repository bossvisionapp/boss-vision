import { useState } from 'react'
import { Avatar, Card, cx } from '../../components/ui'
import { useStore } from '../../data/store'
import { timeAgo } from '../../lib/format'
import { Chat } from '../common/Chats'

/** Входящие поддержки — как «Хабарлар → Кіріс» в Learning Platform: чаты по ученикам с ответом */
export function AdminInbox() {
  const { db } = useStore()
  const threads = db.threads.filter((t) => t.kind === 'support').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const [sel, setSel] = useState(threads[0]?.id ?? '')
  if (!threads.length) return <p className="text-sm text-muted">Обращений пока нет.</p>
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="space-y-2">
        {threads.map((t) => {
          const u = db.users.find((x) => x.id === t.participants[0])
          const last = [...db.messages].reverse().find((m) => m.threadId === t.id)
          const unread = t.unreadFor.includes('staff')
          return (
            <button key={t.id} type="button" onClick={() => setSel(t.id)} className="w-full text-left">
              <Card className={cx('flex gap-3 p-3', sel === t.id && 'border-gold')}>
                <Avatar name={u?.name ?? '?'} color={u?.avatarColor ?? '#999'} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2"><p className="truncate text-sm font-bold">{u?.name}</p><span className="text-[10px] text-muted">{timeAgo(t.updatedAt)}</span></div>
                  <p className={cx('truncate text-xs', unread ? 'font-bold' : 'text-muted')}>{last?.text}</p>
                </div>
                {unread && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />}
              </Card>
            </button>
          )
        })}
      </div>
      {sel && <Chat threadId={sel} embedded key={sel} />}
    </div>
  )
}
