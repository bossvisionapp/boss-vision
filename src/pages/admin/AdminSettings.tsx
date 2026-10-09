import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Field, Input, Textarea, Toggle } from '../../components/ui'
import { useStore } from '../../data/store'
import { PART_LABEL } from '../../lib/match'
import type { MatchWeights } from '../../types'
import { ThemePicker } from '../common/Settings'

/** Настройки платформы: модерация, веса AI Matching (ТЗ п.33 — «настраиваются через backend»), WhatsApp, шаблоны ответов куратора */
export function AdminSettings() {
  const { db, update, reset } = useStore()
  const s = db.settings
  const set = (p: Partial<typeof s>) => update((d) => ({ ...d, settings: { ...d.settings, ...p } }))
  const [tpl, setTpl] = useState(s.replyTemplates.join('\n'))
  const total = Object.values(s.weights).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-5">
        <p className="font-display text-lg font-semibold">Вакансии</p>
        <Toggle label="Премодерация: оплаченная вакансия сначала идёт на проверку администратору" checked={s.premoderation} onChange={(premoderation) => set({ premoderation })} />
        <p className="text-xs text-muted">Выключено — вакансия публикуется сразу после оплаты (ТЗ п.29). Админ всё равно может заблокировать её позже.</p>
      </Card>

      <Card className="space-y-3 p-5">
        <p className="font-display text-lg font-semibold">Веса AI Matching</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(s.weights) as (keyof MatchWeights)[]).map((k) => (
            <Field key={k} label={`${PART_LABEL[k]} — ${Math.round((s.weights[k] / total) * 100)}%`}>
              <input type="range" min={0} max={50} value={s.weights[k]} onChange={(e) => set({ weights: { ...s.weights, [k]: Number(e.target.value) } })} className="w-full accent-[var(--c-gold)]" />
            </Field>
          ))}
        </div>
        <p className="text-xs text-muted">Overall Match = взвешенная сумма Skills, Experience, Salary, Location, Format, Personality.</p>
      </Card>

      <Card className="space-y-3 p-5">
        <p className="font-display text-lg font-semibold">Связь</p>
        <Field label="WhatsApp для заявок (подбор под ключ, подписка)"><Input value={s.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} /></Field>
        <Field label="Шаблоны ответов куратора (по одному на строку)"><Textarea value={tpl} onChange={(e) => setTpl(e.target.value)} onBlur={() => set({ replyTemplates: tpl.split('\n').map((x) => x.trim()).filter(Boolean) })} /></Field>
      </Card>

      <Card className="space-y-3 p-5">
        <p className="font-display text-lg font-semibold">Оформление (ваш аккаунт)</p>
        <ThemePicker />
      </Card>

      <Card className="space-y-2 p-5">
        <p className="font-display text-lg font-semibold">Демо-данные</p>
        <p className="text-sm text-muted">Вернуть пользователей, вакансии, курсы и платежи к исходному состоянию.</p>
        <Button variant="danger" onClick={() => confirm('Сбросить все демо-данные?') && reset()}><RotateCcw size={16} /> Сбросить демо-данные</Button>
      </Card>
    </div>
  )
}
