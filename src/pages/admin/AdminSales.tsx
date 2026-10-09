import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, Chip, Field, Input, Select, Toggle } from '../../components/ui'
import { useStore } from '../../data/store'
import { PAYMENT_STATUS_LABEL, PAYMENT_TONE, TARIFF_INFO, dateLong, dateShort, money, waLink } from '../../lib/format'
import type { Lead, PaymentStatus, ProductType, Promo, VacancyTariff } from '../../types'
import { Table } from './AdminShell'

const PRODUCT_LABEL: Record<ProductType, string> = { vacancy: 'Вакансия', base: 'База резюме', course: 'Курс', recruitment: 'Подбор', subscription: 'Подписка' }

/** ТЗ п.54 — платежи: ID, пользователь, продукт, сумма, дата, способ, статус. Смена статуса сама меняет доступы. */
export function AdminPayments() {
  const { db, setPaymentStatus } = useStore()
  const [f, setF] = useState<'' | PaymentStatus>('')
  const list = db.payments.filter((p) => !f || p.status === f)
  const total = db.payments.filter((p) => p.status === 'success').reduce((s, p) => s + p.amount, 0)
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={!f} onClick={() => setF('')}>Все</Chip>
        {(['pending', 'success', 'failed', 'refunded'] as PaymentStatus[]).map((s) => <Chip key={s} active={f === s} onClick={() => setF(s)}>{PAYMENT_STATUS_LABEL[s]} · {db.payments.filter((p) => p.status === s).length}</Chip>)}
        <span className="ml-auto font-display text-xl font-semibold">Выручка: {money(total)}</span>
      </div>
      <Table head={['ID', 'Пользователь', 'Продукт', 'Сумма', 'Дата', 'Способ', 'Статус']}>
        {list.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3 font-semibold">{p.id}</td>
            <td className="px-4 py-3">{db.users.find((u) => u.id === p.userId)?.name ?? '—'}</td>
            <td className="px-4 py-3"><Badge>{PRODUCT_LABEL[p.product.type]}</Badge> <span className="text-muted">{p.product.label.replace(/^Вакансия\s/, '')}</span></td>
            <td className="px-4 py-3 font-semibold">{money(p.amount)}{p.promo && <span className="block text-[10px] text-gold">{p.promo}</span>}</td>
            <td className="px-4 py-3 text-muted">{dateShort(p.createdAt)}</td>
            <td className="px-4 py-3 text-muted">{p.method === 'kaspi' ? 'Kaspi' : 'Карта'}</td>
            <td className="px-4 py-3">
              <select
                value={p.status}
                onChange={(e) => {
                  const s = e.target.value as PaymentStatus
                  if (s === 'refunded' && !confirm('Оформить возврат? Доступ, выданный этим платежом, будет закрыт автоматически.')) return
                  setPaymentStatus(p.id, s)
                }}
                className="rounded-xl border border-line bg-surface px-2 py-1 text-xs"
              >
                {(['pending', 'success', 'failed', 'refunded'] as PaymentStatus[]).map((s) => <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>)}
              </select>
              <Badge tone={PAYMENT_TONE[p.status]} className="ml-1">{PAYMENT_STATUS_LABEL[p.status]}</Badge>
            </td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-muted">Pending → Success открывает доступ автоматически. Refunded закрывает доступ. Ручная активация не нужна (ТЗ п.55).</p>
    </div>
  )
}

/** Тарифы: вакансии, база, подбор под ключ */
export function AdminPricing() {
  const { db, update } = useStore()
  const p = db.settings.prices
  const set = (patch: Partial<typeof p>) => update((d) => ({ ...d, settings: { ...d.settings, prices: { ...d.settings.prices, ...patch } } }))
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="space-y-3 p-5">
        <p className="font-display text-lg font-semibold">Размещение вакансий</p>
        {(Object.keys(TARIFF_INFO) as VacancyTariff[]).map((t) => (
          <Field key={t} label={TARIFF_INFO[t].label}><Input type="number" value={p.vacancy[t]} onChange={(e) => set({ vacancy: { ...p.vacancy, [t]: Number(e.target.value) } })} /></Field>
        ))}
      </Card>
      <Card className="space-y-3 p-5">
        <p className="font-display text-lg font-semibold">База резюме (1 ниша)</p>
        <Field label="1 месяц"><Input type="number" value={p.base.month} onChange={(e) => set({ base: { ...p.base, month: Number(e.target.value) } })} /></Field>
        <Field label="1 год"><Input type="number" value={p.base.year} onChange={(e) => set({ base: { ...p.base, year: Number(e.target.value) } })} /></Field>
        <p className="text-xs text-muted">Активных подписок на базу: {db.users.reduce((s, u) => s + u.baseAccess.filter((a) => new Date(a.until) > new Date()).length, 0)}</p>
      </Card>
      <Card className="space-y-3 p-5">
        <p className="font-display text-lg font-semibold">Подбор под ключ</p>
        <Field label="Базовый"><Input type="number" value={p.recruitment.basic} onChange={(e) => set({ recruitment: { ...p.recruitment, basic: Number(e.target.value) } })} /></Field>
        <Field label="Стандарт"><Input type="number" value={p.recruitment.standard} onChange={(e) => set({ recruitment: { ...p.recruitment, standard: Number(e.target.value) } })} /></Field>
        <Field label="Premium"><Input type="number" value={p.recruitment.premium} onChange={(e) => set({ recruitment: { ...p.recruitment, premium: Number(e.target.value) } })} /></Field>
      </Card>
      <p className="text-xs text-muted md:col-span-3">Цены курсов меняются в Academy → Курсы → Настройки. Изменения применяются сразу.</p>
    </div>
  )
}

/** ТЗ п.56 — промокоды */
export function AdminPromos() {
  const { db, update } = useStore()
  const [f, setF] = useState<Promo>({ code: '', type: 'percent', value: 10, maxUses: 100, used: 0, product: 'all', active: true })
  const save = (list: Promo[]) => update((d) => ({ ...d, promos: list }))
  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-5 sm:grid-cols-6">
        <Field label="Код" className="sm:col-span-2"><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="BOSS20" /></Field>
        <Field label="Тип"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Promo['type'] })} options={[{ value: 'percent', label: '%' }, { value: 'fixed', label: '₸' }]} /></Field>
        <Field label="Скидка"><Input type="number" value={f.value} onChange={(e) => setF({ ...f, value: Number(e.target.value) })} /></Field>
        <Field label="Лимит"><Input type="number" value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: Number(e.target.value) })} /></Field>
        <Field label="До"><Input type="date" onChange={(e) => setF({ ...f, until: e.target.value ? new Date(e.target.value).toISOString() : undefined })} /></Field>
        <Field label="Продукт" className="sm:col-span-2"><Select value={f.product} onChange={(e) => setF({ ...f, product: e.target.value as Promo['product'] })} options={[{ value: 'all', label: 'Все продукты' }, ...(Object.keys(PRODUCT_LABEL) as ProductType[]).map((k) => ({ value: k, label: PRODUCT_LABEL[k] }))]} /></Field>
        <div className="self-end sm:col-span-4">
          <Button disabled={!f.code || db.promos.some((p) => p.code === f.code)} onClick={() => { save([f, ...db.promos]); setF({ ...f, code: '' }) }}><Plus size={16} /> Создать промокод</Button>
        </div>
      </Card>
      <Table head={['Код', 'Скидка', 'Продукт', 'Использовано', 'Срок', 'Активен', '']}>
        {db.promos.map((p) => (
          <tr key={p.code}>
            <td className="px-4 py-3 font-display text-base font-semibold">{p.code}</td>
            <td className="px-4 py-3">{p.type === 'percent' ? `${p.value}%` : money(p.value)}</td>
            <td className="px-4 py-3 text-muted">{p.product === 'all' ? 'Все' : PRODUCT_LABEL[p.product]}</td>
            <td className="px-4 py-3">{p.used} / {p.maxUses}</td>
            <td className="px-4 py-3 text-muted">{p.until ? dateLong(p.until) : '∞'}</td>
            <td className="px-4 py-3"><Toggle checked={p.active} onChange={(active) => save(db.promos.map((x) => (x.code === p.code ? { ...x, active } : x)))} /></td>
            <td className="px-4 py-3"><button type="button" onClick={() => save(db.promos.filter((x) => x.code !== p.code))} className="text-muted hover:text-danger" aria-label="Удалить"><Trash2 size={16} /></button></td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

/** Заявки: подбор под ключ и кадровая подписка (уходят из приложения в WhatsApp + сюда, как в CRM) */
export function AdminLeads() {
  const { db, update } = useStore()
  const setStatus = (id: string, status: Lead['status']) => update((d) => ({ ...d, leads: d.leads.map((l) => (l.id === id ? { ...l, status } : l)) }))
  return (
    <div className="space-y-3">
      {db.leads.map((l) => (
        <Card key={l.id} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{l.name} · {l.company}</p>
            <div className="flex items-center gap-2">
              <Badge tone="brand">{l.type === 'recruitment' ? 'Подбор под ключ' : 'Кадровая подписка'}</Badge>
              <select value={l.status} onChange={(e) => setStatus(l.id, e.target.value as Lead['status'])} className="rounded-xl border border-line bg-surface px-2 py-1 text-xs">
                <option value="new">Новая</option>
                <option value="in_progress">В работе</option>
                <option value="done">Закрыта</option>
              </select>
            </div>
          </div>
          {l.tariff && <p className="text-sm">Тариф: <b>{l.tariff}</b></p>}
          <p className="text-sm text-muted">{l.details}</p>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>{l.phone}</span>
            <span>{dateLong(l.createdAt)}</span>
            <a href={waLink(l.phone, `Здравствуйте, ${l.name}! Это команда BOSS VISION по вашей заявке.`)} target="_blank" rel="noreferrer" className="font-semibold text-success">Написать в WhatsApp →</a>
          </div>
        </Card>
      ))}
      {db.leads.length === 0 && <p className="text-sm text-muted">Заявок нет</p>}
    </div>
  )
}
