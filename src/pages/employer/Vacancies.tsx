import { Bookmark, Briefcase, CalendarClock, Eye, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Checkout, type CheckoutProduct } from '../../components/Checkout'
import { Badge, Button, Card, Empty, PageHeader, Tabs } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { TARIFF_INFO, VACANCY_STATUS_LABEL, VACANCY_TONE, dateLong, daysLeft, salaryRange } from '../../lib/format'
import type { VacancyStatus } from '../../types'

type Tab = 'active' | 'moderation' | 'closed' | 'draft'
const TAB_STATUS: Record<Tab, VacancyStatus[]> = { active: ['active'], moderation: ['moderation', 'rejected'], closed: ['closed', 'blocked'], draft: ['draft'] }

/** ТЗ п.30 — Мои вакансии: активные / модерация / завершённые / черновики */
export default function EmployerVacancies() {
  const { db, update } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('active')
  const [pay, setPay] = useState<CheckoutProduct | null>(null)
  const mine = db.vacancies.filter((v) => v.ownerId === me.id)
  const list = mine.filter((v) => TAB_STATUS[tab].includes(v.status))
  const setStatus = (id: string, status: VacancyStatus) => update((d) => ({ ...d, vacancies: d.vacancies.map((v) => (v.id === id ? { ...v, status } : v)) }))

  return (
    <div>
      <PageHeader title="Мои вакансии" action={<Button onClick={() => nav('/employer/vacancies/new')}><Plus size={17} /> Новая</Button>} />
      <Tabs
        tabs={(['active', 'moderation', 'closed', 'draft'] as Tab[]).map((t) => ({
          id: t,
          label: { active: 'Активные', moderation: 'На модерации', closed: 'Завершённые', draft: 'Черновики' }[t],
          count: mine.filter((v) => TAB_STATUS[t].includes(v.status)).length,
        }))}
        value={tab}
        onChange={setTab}
      />
      <div className="space-y-3">
        {list.map((v) => {
          const apps = db.applications.filter((a) => a.vacancyId === v.id)
          return (
            <Card key={v.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <button type="button" onClick={() => nav(`/jobs/${v.id}`)} className="text-left font-display text-lg font-semibold hover:text-brand">{v.title}</button>
                  <p className="text-[13px] text-muted">{salaryRange(v.salaryFrom, v.salaryTo)} · {v.city}</p>
                </div>
                <div className="flex gap-1.5">
                  <Badge tone="dark">{TARIFF_INFO[v.tariff].label}</Badge>
                  <Badge tone={VACANCY_TONE[v.status]}>{VACANCY_STATUS_LABEL[v.status]}</Badge>
                </div>
              </div>
              {v.rejectReason && v.status === 'rejected' && <p className="mt-2 rounded-2xl bg-danger-soft p-2.5 text-sm text-danger">Причина: {v.rejectReason}</p>}
              <div className="mt-3 grid grid-cols-5 gap-1.5 text-center">
                <Metric icon={<Eye size={13} />} n={v.views} l="просмотры" />
                <Metric icon={<Users size={13} />} n={apps.length} l="отклики" />
                <Metric icon={<Bookmark size={13} />} n={v.saves} l="сохранения" />
                <Metric icon={<Users size={13} />} n={apps.filter((a) => !['rejected', 'new'].includes(a.status)).length} l="кандидаты" />
                <Metric icon={<CalendarClock size={13} />} n={v.status === 'active' ? daysLeft(v.expiresAt) : 0} l="дней" />
              </div>
              {v.expiresAt && v.status === 'active' && <p className="mt-2 text-[11px] text-muted">Дата окончания: {dateLong(v.expiresAt)}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {v.status === 'draft' && (
                  <>
                    <Button size="sm" onClick={() => nav(`/employer/vacancies/${v.id}/edit`)}>Продолжить</Button>
                    <Button size="sm" variant="gold" onClick={() => setPay({ type: 'vacancy', refId: v.id, label: `Вакансия ${TARIFF_INFO[v.tariff].label} — ${v.title}`, amount: db.settings.prices.vacancy[v.tariff] })}>
                      Оплатить и опубликовать
                    </Button>
                  </>
                )}
                {v.status === 'active' && (
                  <>
                    <Button size="sm" onClick={() => nav(`/employer/applicants?v=${v.id}`)}>Отклики</Button>
                    <Button size="sm" variant="gold" onClick={() => nav(`/employer/ai-match?v=${v.id}`)}>AI-подбор</Button>
                    <Button size="sm" variant="secondary" onClick={() => nav(`/employer/vacancies/${v.id}/edit`)}>Изменить</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(v.id, 'closed')}>Завершить</Button>
                  </>
                )}
                {(v.status === 'closed' || v.status === 'rejected') && (
                  <Button size="sm" variant="secondary" onClick={() => setPay({ type: 'vacancy', refId: v.id, label: `Продление: ${TARIFF_INFO[v.tariff].label} — ${v.title}`, amount: db.settings.prices.vacancy[v.tariff] })}>
                    Опубликовать снова
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>
      {list.length === 0 && <Empty icon={<Briefcase />} title="Здесь пусто" action={<Button onClick={() => nav('/employer/vacancies/new')}>Создать вакансию</Button>} />}
      <Checkout open={!!pay} product={pay} onClose={() => setPay(null)} />
    </div>
  )
}

function Metric({ icon, n, l }: { icon: React.ReactNode; n: number; l: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 py-2">
      <p className="flex items-center justify-center gap-1 font-bold">{icon}{n}</p>
      <p className="text-[9.5px] text-muted">{l}</p>
    </div>
  )
}
