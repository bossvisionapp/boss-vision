import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Chip, Field, Input, Modal, Search, Select, Textarea } from '../../components/ui'
import { notify, useStore } from '../../data/store'
import { TARIFF_INFO, VACANCY_STATUS_LABEL, VACANCY_TONE, addDays, dateShort, daysLeft, salaryRange } from '../../lib/format'
import type { DB, Vacancy, VacancyStatus, VacancyTariff } from '../../types'
import { Table } from './AdminShell'

/** ТЗ п.51 — модерация и управление вакансиями */
export function AdminJobs() {
  const { db, update } = useStore()
  const [f, setF] = useState<'' | VacancyStatus>('moderation')
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Vacancy | null>(null)
  const [reject, setReject] = useState<Vacancy | null>(null)
  const [reason, setReason] = useState('')
  const list = db.vacancies.filter((v) => (!f || v.status === f) && (!q || v.title.toLowerCase().includes(q.toLowerCase())))

  const patch = (v: Vacancy, p: Partial<Vacancy>, msg?: string) =>
    update((d) => {
      let next: DB = { ...d, vacancies: d.vacancies.map((x) => (x.id === v.id ? { ...x, ...p } : x)) }
      if (msg) next = notify(next, v.ownerId, msg, '/employer/vacancies')
      return next
    })

  return (
    <div>
      <div className="mb-3"><Search value={q} onChange={setQ} placeholder="Поиск вакансий" /></div>
      <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto">
        <Chip active={!f} onClick={() => setF('')}>Все · {db.vacancies.length}</Chip>
        {(Object.keys(VACANCY_STATUS_LABEL) as VacancyStatus[]).map((s) => (
          <Chip key={s} active={f === s} onClick={() => setF(s)}>{VACANCY_STATUS_LABEL[s]} · {db.vacancies.filter((v) => v.status === s).length}</Chip>
        ))}
      </div>
      <Table head={['Вакансия', 'Статус', 'Тариф', 'Статистика', 'Действия']}>
        {list.map((v) => {
          const c = db.companies.find((x) => x.id === v.companyId)
          const apps = db.applications.filter((a) => a.vacancyId === v.id).length
          return (
            <tr key={v.id} className="align-top">
              <td className="px-4 py-3">
                <Link to={`/jobs/${v.id}`} className="font-semibold hover:text-brand">{v.title}</Link>
                <p className="text-xs text-muted">{c?.name} · {salaryRange(v.salaryFrom, v.salaryTo)} · {dateShort(v.createdAt)}</p>
              </td>
              <td className="px-4 py-3"><Badge tone={VACANCY_TONE[v.status]}>{VACANCY_STATUS_LABEL[v.status]}</Badge>{v.status === 'active' && <p className="mt-1 text-[11px] text-muted">ещё {daysLeft(v.expiresAt)} дн.</p>}</td>
              <td className="px-4 py-3">
                <select value={v.tariff} onChange={(e) => patch(v, { tariff: e.target.value as VacancyTariff })} className="rounded-xl border border-line bg-surface px-2 py-1 text-xs">
                  {(Object.keys(TARIFF_INFO) as VacancyTariff[]).map((t) => <option key={t} value={t}>{TARIFF_INFO[t].label}</option>)}
                </select>
              </td>
              <td className="px-4 py-3 text-xs text-muted">👁 {v.views} · 📩 {apps} · ♥ {v.saves}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {v.status !== 'active' && <Button size="sm" onClick={() => patch(v, { status: 'active', expiresAt: v.expiresAt ?? addDays(30), rejectReason: undefined }, `Вакансия «${v.title}» одобрена и опубликована ✅`)}>Одобрить</Button>}
                  {v.status === 'moderation' && <Button size="sm" variant="secondary" onClick={() => setReject(v)}>Отклонить</Button>}
                  {v.status === 'active' && <Button size="sm" variant="secondary" onClick={() => patch(v, { expiresAt: addDays(30, new Date(v.expiresAt ?? Date.now()).getTime()) }, `Вакансия «${v.title}» продлена на 30 дней`)}>+30 дн.</Button>}
                  <Button size="sm" variant="ghost" onClick={() => setEdit(v)}>Изменить</Button>
                  {v.status !== 'blocked' && <Button size="sm" variant="danger" onClick={() => patch(v, { status: 'blocked' }, `Вакансия «${v.title}» заблокирована модератором`)}>Блок</Button>}
                  <Button size="sm" variant="ghost" onClick={() => confirm('Удалить вакансию навсегда?') && update((d) => ({ ...d, vacancies: d.vacancies.filter((x) => x.id !== v.id) }))}>🗑</Button>
                </div>
              </td>
            </tr>
          )
        })}
      </Table>
      {list.length === 0 && <p className="mt-4 text-sm text-muted">Пусто 🎉</p>}

      <Modal open={!!reject} onClose={() => setReject(null)} title="Причина отклонения">
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Например: не указана зарплата / дискриминационные требования" />
        <Button variant="danger" className="mt-3 w-full" onClick={() => { patch(reject!, { status: 'rejected', rejectReason: reason || 'Не соответствует правилам' }, `Вакансия «${reject!.title}» отклонена: ${reason || 'не соответствует правилам'}`); setReject(null); setReason('') }}>Отклонить</Button>
      </Modal>

      {edit && (
        <Modal open onClose={() => setEdit(null)} title="Редактирование вакансии">
          <div className="space-y-3">
            <Field label="Название"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Зарплата от"><Input type="number" value={edit.salaryFrom ?? ''} onChange={(e) => setEdit({ ...edit, salaryFrom: Number(e.target.value) || undefined })} /></Field>
              <Field label="Зарплата до"><Input type="number" value={edit.salaryTo ?? ''} onChange={(e) => setEdit({ ...edit, salaryTo: Number(e.target.value) || undefined })} /></Field>
            </div>
            <Field label="Статус"><Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as VacancyStatus })} options={Object.entries(VACANCY_STATUS_LABEL).map(([value, label]) => ({ value, label }))} /></Field>
            <Field label="Описание"><Textarea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <Button className="w-full" onClick={() => { patch(edit, edit); setEdit(null) }}>Сохранить</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
