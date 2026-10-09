import { ArrowLeft, CheckCheck, FileText, HeadphonesIcon, MessageCircle, Paperclip, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar, Card, Empty, PageHeader, cx } from '../../components/ui'
import { isStaff, useMe, useStore } from '../../data/store'
import { readFileAsDataUrl, timeAgo } from '../../lib/format'
import type { Attachment, Thread } from '../../types'

/** ТЗ п.40 — чат работодатель ↔ кандидат + поддержка. Текст, файлы, изображения, прочитано/не прочитано. */
export default function Chats() {
  const { threadId } = useParams()
  const { db, openSupport } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const threads = db.threads
    .filter((t) => t.participants.includes(me.id) || (isStaff(me) && t.kind === 'support'))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <div>
      <PageHeader title="Чаты" subtitle="Переписка после взаимного интереса" />
      <div className="grid gap-4 lg:grid-cols-[330px_1fr]">
        <div className={cx('space-y-2', threadId && 'hidden lg:block')}>
          {!isStaff(me) && (
            <button type="button" onClick={() => nav(`/chats/${openSupport('Поддержка BOSS VISION')}`)} className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-gold/50 p-3 text-left text-sm">
              <HeadphonesIcon size={20} className="text-gold" /> <span className="font-semibold">Написать в поддержку / куратору</span>
            </button>
          )}
          {threads.map((t) => (
            <ThreadRow key={t.id} t={t} active={t.id === threadId} />
          ))}
          {threads.length === 0 && <Empty icon={<MessageCircle />} title="Чатов пока нет" text="Чат появится после отклика или приглашения" />}
        </div>
        {threadId ? <Chat threadId={threadId} /> : <div className="hidden items-center justify-center rounded-3xl border border-dashed border-line text-sm text-muted lg:flex">Выберите диалог</div>}
      </div>
    </div>
  )
}

export function threadPeer(t: Thread, meId: string, staff: boolean) {
  if (t.kind === 'support') return staff ? t.participants[0] : null
  return t.participants.find((p) => p !== meId) ?? null
}

function ThreadRow({ t, active }: { t: Thread; active: boolean }) {
  const { db } = useStore()
  const me = useMe()
  const staff = isStaff(me)
  const peerId = threadPeer(t, me.id, staff)
  const peer = db.users.find((u) => u.id === peerId)
  const last = [...db.messages].reverse().find((m) => m.threadId === t.id)
  const unread = t.unreadFor.includes(me.id) || (staff && t.kind === 'support' && t.unreadFor.includes('staff'))
  return (
    <Link to={`/chats/${t.id}`}>
      <Card className={cx('mb-2 flex gap-3 p-3', active ? 'border-gold' : '')}>
        {peer ? <Avatar name={peer.name} color={peer.avatarColor} photo={peer.avatar} size={44} /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-on-accent">BV</div>}
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-2">
            <p className="truncate text-sm font-bold">{peer?.name ?? 'Поддержка BOSS VISION'}</p>
            <span className="shrink-0 text-[11px] text-muted">{timeAgo(t.updatedAt)}</span>
          </div>
          <p className="truncate text-xs text-brand">{t.kind === 'support' ? '💬 Поддержка' : t.title}</p>
          <p className={cx('truncate text-xs', unread ? 'font-bold' : 'text-muted')}>{last?.attachments.length ? `📎 ${last.attachments[0].name}` : last?.text ?? 'Начните диалог'}</p>
        </div>
        {unread && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gold" />}
      </Card>
    </Link>
  )
}

export function Chat({ threadId, embedded }: { threadId: string; embedded?: boolean }) {
  const { db, sendMessage, markThreadRead } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<Attachment[]>([])
  const bottom = useRef<HTMLDivElement>(null)
  const t = db.threads.find((x) => x.id === threadId)
  const msgs = db.messages.filter((m) => m.threadId === threadId)
  const staff = isStaff(me)

  useEffect(() => {
    markThreadRead(threadId)
    bottom.current?.scrollIntoView({ block: 'end' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, msgs.length])

  if (!t) return <Empty icon={<MessageCircle />} title="Диалог не найден" />
  const peer = db.users.find((u) => u.id === threadPeer(t, me.id, staff))
  const peerResume = peer && db.resumes.find((r) => r.userId === peer.id)
  const readByPeer = !t.unreadFor.some((p) => p !== me.id)

  const attach = async (list: FileList | null) => {
    if (!list) return
    const out: Attachment[] = []
    for (const f of Array.from(list).slice(0, 3)) {
      if (f.size > 1.5 * 1024 * 1024) continue // демо-ограничение 1,5 МБ
      out.push({ name: f.name, type: f.type, dataUrl: await readFileAsDataUrl(f) })
    }
    setFiles([...files, ...out])
  }

  return (
    <Card className={cx('flex flex-col p-0', embedded ? 'h-[70vh]' : 'h-[calc(100vh-14rem)] min-h-[440px]')}>
      <div className="flex items-center gap-3 border-b border-line p-3">
        {!embedded && (
          <button type="button" onClick={() => nav('/chats')} className="rounded-lg p-1 lg:hidden" aria-label="Назад">
            <ArrowLeft size={20} />
          </button>
        )}
        {peer ? <Avatar name={peer.name} color={peer.avatarColor} photo={peer.avatar} size={40} /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-on-accent">BV</div>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{peer?.name ?? 'Поддержка BOSS VISION'}</p>
          <p className="truncate text-xs text-muted">{t.kind === 'support' ? (staff ? 'Обращение в поддержку' : 'Кураторы и команда отвечают в рабочее время') : t.title}</p>
        </div>
        {t.vacancyId && (
          <Link to={me.role === 'employer' && peerResume ? `/resumes/${peerResume.id}` : `/jobs/${t.vacancyId}`} className="text-xs font-bold text-brand">
            {me.role === 'employer' ? 'Резюме' : 'Вакансия'}
          </Link>
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto bg-bg/50 p-4">
        {msgs.map((m) => {
          const mine = m.fromId === me.id
          const author = db.users.find((u) => u.id === m.fromId)
          return (
            <div key={m.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cx('max-w-[82%] rounded-3xl px-4 py-2.5 text-sm', mine ? 'rounded-br-lg bg-accent text-on-accent' : 'rounded-bl-lg bg-surface shadow-sm')}>
                {t.kind === 'support' && !mine && author && <p className="mb-0.5 text-[11px] font-bold opacity-70">{author.name}</p>}
                {m.attachments.map((a) =>
                  a.type.startsWith('image/') ? (
                    <img key={a.name} src={a.dataUrl} alt={a.name} className="mb-1.5 max-h-56 rounded-2xl" />
                  ) : (
                    <a key={a.name} href={a.dataUrl} download={a.name} className="mb-1.5 flex items-center gap-2 rounded-2xl bg-black/10 px-3 py-2 text-xs font-semibold">
                      <FileText size={16} /> {a.name}
                    </a>
                  ),
                )}
                {m.text && <p className="whitespace-pre-line">{m.text}</p>}
                <p className={cx('mt-0.5 flex items-center justify-end gap-1 text-[10px]', mine ? 'opacity-70' : 'text-muted')}>
                  {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  {mine && m === msgs[msgs.length - 1] && <CheckCheck size={12} className={readByPeer ? 'text-gold' : ''} />}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-line px-3 pt-2">
          {files.map((f) => (
            <button key={f.name} type="button" onClick={() => setFiles(files.filter((x) => x !== f))} className="rounded-full bg-surface-2 px-3 py-1 text-xs">
              📎 {f.name} ✕
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage(threadId, text, files)
          setText('')
          setFiles([])
        }}
        className="flex items-center gap-2 border-t border-line p-3"
      >
        <label className="cursor-pointer rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Прикрепить файл">
          <Paperclip size={19} />
          <input type="file" multiple className="hidden" accept="image/*,.pdf,.doc,.docx,.xlsx" onChange={(e) => attach(e.target.files)} />
        </label>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение…" className="h-11 flex-1 rounded-2xl border border-line bg-surface px-4 text-sm outline-none focus:border-brand" />
        <button type="submit" disabled={!text.trim() && !files.length} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-on-accent disabled:opacity-40" aria-label="Отправить">
          <Send size={18} />
        </button>
      </form>
    </Card>
  )
}
