import { Bell, Check, Moon, Sun, SunMoon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, Field, Input, PageHeader, Tabs, Toggle, cx } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { PAYMENT_STATUS_LABEL, PAYMENT_TONE, dateLong, money, timeAgo } from '../../lib/format'
import type { ThemeMode, ThemeName } from '../../types'

export const THEMES: { id: ThemeName; name: string; desc: string; swatch: [string, string, string] }[] = [
  { id: 'classic', name: 'Classic', desc: 'Бежевый люкс — как в макете', swatch: ['#f4eee5', '#2a241f', '#b08d57'] },
  { id: 'gold', name: 'Gold', desc: 'Чёрное золото', swatch: ['#0b0a08', '#d4ad5a', '#f7f3ea'] },
  { id: 'noir', name: 'Noir', desc: 'Чёрно-белый минимализм', swatch: ['#000000', '#ffffff', '#c7a774'] },
  { id: 'royal', name: 'Royal', desc: 'Глубокий синий + белый', swatch: ['#0d2150', '#ffffff', '#d3b47a'] },
]

export function ThemePicker() {
  const { theme, setTheme } = useStore()
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id, theme.mode)}
            className={cx('rounded-2xl border-2 p-3 text-left transition', theme.theme === t.id ? 'border-gold' : 'border-line')}
          >
            <div className="flex gap-1">
              {t.swatch.map((c) => <span key={c} className="h-6 w-6 rounded-full border border-black/10" style={{ background: c }} />)}
            </div>
            <p className="mt-2 text-sm font-bold">{t.name}</p>
            <p className="text-[11px] text-muted">{t.desc}</p>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['light', 'День', Sun],
            ['dark', 'Ночь', Moon],
            ['auto', 'Авто', SunMoon],
          ] as [ThemeMode, string, typeof Sun][]
        ).map(([m, l, Icon]) => (
          <button key={m} type="button" onClick={() => setTheme(theme.theme, m)} className={cx('flex items-center justify-center gap-2 rounded-2xl border-2 p-3 text-sm font-semibold', theme.mode === m ? 'border-gold' : 'border-line')}>
            <Icon size={17} /> {l}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">«Авто»: днём (7:00–20:00) светлая тема, ночью — тёмная.</p>
    </div>
  )
}

export default function Settings() {
  const { db, updateMe } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'main' | 'notify' | 'payments' | 'security'>((params.get('tab') as 'payments') ?? 'main')
  const [p, setP] = useState({ name: me.name, phone: me.phone, city: me.city })
  const [pwd, setPwd] = useState({ old: '', next: '' })
  const [msg, setMsg] = useState('')
  const payments = db.payments.filter((x) => x.userId === me.id)
  const flash = (s: string) => {
    setMsg(s)
    setTimeout(() => setMsg(''), 2200)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Настройки" back />
      <Tabs
        tabs={[
          { id: 'main', label: 'Основное' },
          { id: 'notify', label: 'Уведомления' },
          { id: 'payments', label: 'Платежи', count: payments.length },
          { id: 'security', label: 'Безопасность' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {msg && <p className="mb-3 rounded-2xl bg-success-soft px-4 py-2 text-sm text-success">{msg}</p>}

      {tab === 'main' && (
        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <p className="font-display text-lg font-semibold">Оформление</p>
            <ThemePicker />
          </Card>
          <Card className="space-y-3 p-5">
            <p className="font-display text-lg font-semibold">Личные данные</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Имя"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
              <Field label="Телефон"><Input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
              <Field label="Город"><Input value={p.city} onChange={(e) => setP({ ...p, city: e.target.value })} /></Field>
            </div>
            <Button onClick={() => { updateMe(p); flash('Сохранено') }}>Сохранить</Button>
          </Card>
        </div>
      )}

      {tab === 'notify' && (
        <Card className="space-y-4 p-5">
          <p className="flex items-center gap-2 font-display text-lg font-semibold"><Bell size={18} /> Каналы (ТЗ п.47–48)</p>
          <Toggle label="Push-уведомления в приложении" checked={me.settings.push} onChange={(v) => updateMe({ settings: { ...me.settings, push: v } })} />
          <Toggle label="E-mail: заявки, чеки, подтверждения" checked={me.settings.email} onChange={(v) => updateMe({ settings: { ...me.settings, email: v } })} />
          <Toggle label="WhatsApp: приглашения и важные события" checked={me.settings.whatsapp} onChange={(v) => updateMe({ settings: { ...me.settings, whatsapp: v } })} />
          <p className="text-xs text-muted">
            {me.role === 'employer'
              ? 'Вы получаете: новый отклик, новый подходящий кандидат, сообщение, окончание подписки и вакансии, «AI нашёл кандидатов».'
              : 'Вы получаете: новая подходящая вакансия, просмотр профиля, приглашение, сообщение, новый урок, тест завершён, сертификат, «AI подобрал вакансию».'}
          </p>
        </Card>
      )}

      {tab === 'payments' && (
        <div className="space-y-2">
          {payments.length === 0 && <p className="text-sm text-muted">Платежей пока нет.</p>}
          {payments.map((x) => (
            <Card key={x.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{x.product.label}</p>
                <p className="text-xs text-muted">{x.id} · {dateLong(x.createdAt)} · {x.method === 'kaspi' ? 'Kaspi' : 'Карта'}{x.promo ? ` · ${x.promo}` : ''}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{money(x.amount)}</p>
                <Badge tone={PAYMENT_TONE[x.status]}>{PAYMENT_STATUS_LABEL[x.status]}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'security' && (
        <Card className="space-y-3 p-5">
          <p className="font-display text-lg font-semibold">Смена пароля</p>
          <Field label="Текущий пароль"><Input type="password" value={pwd.old} onChange={(e) => setPwd({ ...pwd, old: e.target.value })} /></Field>
          <Field label="Новый пароль" hint="Минимум 6 символов"><Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} /></Field>
          <Button
            disabled={pwd.next.length < 6}
            onClick={() => {
              if (pwd.old !== me.password) return flash('Неверный текущий пароль')
              updateMe({ password: pwd.next })
              setPwd({ old: '', next: '' })
              flash('Пароль изменён')
            }}
          >
            Сменить пароль
          </Button>
          <p className="pt-2 text-xs text-muted">Последняя активность: {timeAgo(me.lastActiveAt)}</p>
          <Button variant="ghost" onClick={() => nav('/notifications')}>История уведомлений</Button>
        </Card>
      )}
    </div>
  )
}

export function Notifications() {
  const { db, me, markNotificationsRead } = useStore()
  const nav = useNavigate()
  const staff = me?.role === 'admin' || me?.role === 'curator'
  const list = db.notifications.filter((n) => n.userId === me!.id || (staff && n.userId === 'staff'))
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Уведомления" back action={<Button size="sm" variant="secondary" onClick={markNotificationsRead}><Check size={14} /> Прочитать все</Button>} />
      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted">Пока пусто</p>}
        {list.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => n.link && nav(n.link)}
            className={cx('flex w-full items-start gap-3 rounded-2xl border p-4 text-left', n.read ? 'border-line bg-surface' : 'border-gold/40 bg-brand-soft/40')}
          >
            {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />}
            <div className="flex-1">
              <p className="text-sm">{n.text}</p>
              <p className="mt-0.5 text-xs text-muted">{timeAgo(n.createdAt)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
