import { ClipboardList, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CompanyMark } from '../../components/cards'
import { Badge, Button, Card, Chip, Empty, PageHeader, cx } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { APP_STATUS_CANDIDATE, APP_TONE, CANDIDATE_PIPELINE, salaryRange, timeAgo } from '../../lib/format'

/** ТЗ п.14 — статусы отклика у кандидата */
export default function Applications() {
  const { db, openThread } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const [f, setF] = useState<'all' | 'active' | 'offer' | 'rejected'>('all')
  const apps = db.applications
    .filter((a) => a.candidateId === me.id)
    .filter((a) => f === 'all' || (f === 'active' ? !['hired', 'rejected', 'offer'].includes(a.status) : f === 'offer' ? ['offer', 'hired'].includes(a.status) : a.status === 'rejected'))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <div>
      <PageHeader title="Мои отклики" subtitle="Отправлен → Просмотрен → Приглашение → Собеседование → Оффер → Принят" back />
      <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto">
        {(
          [
            ['all', 'Все'],
            ['active', 'В процессе'],
            ['offer', 'Офферы'],
            ['rejected', 'Отказы'],
          ] as const
        ).map(([k, l]) => (
          <Chip key={k} active={f === k} onClick={() => setF(k)}>
            {l}
          </Chip>
        ))}
      </div>
      <div className="space-y-3">
        {apps.map((a) => {
          const v = db.vacancies.find((x) => x.id === a.vacancyId)
          const c = v && db.companies.find((x) => x.id === v.companyId)
          if (!v) return null
          const idx = CANDIDATE_PIPELINE.indexOf(a.status === 'suitable' ? 'viewed' : a.status)
          return (
            <Card key={a.id}>
              <div className="flex gap-3">
                <CompanyMark name={c?.name ?? '?'} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link to={`/jobs/${v.id}`} className="font-bold hover:text-brand">
                        {v.title}
                      </Link>
                      <p className="text-[13px] text-muted">
                        {c?.name} · {salaryRange(v.salaryFrom, v.salaryTo)}
                      </p>
                    </div>
                    <Badge tone={APP_TONE[a.status]}>{APP_STATUS_CANDIDATE[a.status]}</Badge>
                  </div>
                  {a.source === 'invite' && <p className="mt-1 text-xs font-semibold text-gold">Работодатель нашёл вас через AI-подбор</p>}
                  {a.status !== 'rejected' ? (
                    <div className="mt-3 grid grid-cols-6 gap-1">
                      {CANDIDATE_PIPELINE.map((s, i) => (
                        <div key={s}>
                          <div className={cx('h-1 rounded-full', i <= idx ? 'bg-gold' : 'bg-surface-2')} />
                          <p className={cx('mt-1 hidden text-[9.5px] leading-tight sm:block', i <= idx ? 'font-semibold' : 'text-muted')}>{APP_STATUS_CANDIDATE[s]}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted">Не сдавайтесь — AI подберёт похожие вакансии, а курс усилит резюме.</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted">Обновлено {timeAgo(a.updatedAt)}</span>
                    <Button size="sm" variant="secondary" onClick={() => nav(`/chats/${openThread(a.employerId, v.title, v.id)}`)}>
                      <MessageCircle size={14} /> Чат
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      {apps.length === 0 && <Empty icon={<ClipboardList />} title="Откликов пока нет" action={<Button onClick={() => nav('/jobs')}>Смотреть вакансии</Button>} />}
    </div>
  )
}
