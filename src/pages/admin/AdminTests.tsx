import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Avatar, Badge, Button, Card, Field, Input, Select, Tabs, Textarea, Toggle } from '../../components/ui'
import { useStore } from '../../data/store'
import { dateLong, uid } from '../../lib/format'
import type { TestDef, TestQuestion } from '../../types'
import { Table } from './AdminShell'

/** ТЗ п.53 — управление AI-тестами: вопросы, варианты, веса, включение, результаты */
export function AdminTests() {
  const { db, update } = useStore()
  const [sel, setSel] = useState<string | null>(null)
  const t = db.tests.find((x) => x.id === sel)
  if (t) return <TestEditor t={t} onBack={() => setSel(null)} />
  const passed = (id: string) => db.users.filter((u) => u.testResults[id]).length
  return (
    <div>
      <Button
        className="mb-4"
        onClick={() => {
          const id = uid('t')
          update((d) => ({ ...d, tests: [...d.tests, { id, title: 'Новый тест', subtitle: '', category: 'Навыки', kind: 'scales', minutes: 5, enabled: false, scales: [{ id: 'a', name: 'Шкала A', description: '', strengths: [], weaknesses: [], niche: '', roles: [], skills: [] }], questions: [] }] }))
          setSel(id)
        }}
      >
        <Plus size={16} /> Создать тест
      </Button>
      <div className="grid gap-3 sm:grid-cols-2">
        {db.tests.map((x) => (
          <Card key={x.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-semibold">{x.title} {x.mandatory && <Badge tone="warn">обязательный</Badge>}</p>
                <p className="text-xs text-muted">{x.category} · {x.questions.length} вопросов · {x.scales.length} шкал · прошли {passed(x.id)}</p>
              </div>
              <Toggle checked={x.enabled} onChange={(enabled) => update((d) => ({ ...d, tests: d.tests.map((y) => (y.id === x.id ? { ...y, enabled } : y)) }))} />
            </div>
            <Button size="sm" variant="secondary" onClick={() => setSel(x.id)}>Редактировать →</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

function TestEditor({ t, onBack }: { t: TestDef; onBack: () => void }) {
  const { db, update } = useStore()
  const [tab, setTab] = useState<'questions' | 'scales' | 'results'>('questions')
  const save = (p: Partial<TestDef>) => update((d) => ({ ...d, tests: d.tests.map((x) => (x.id === t.id ? { ...x, ...p } : x)) }))
  const setQ = (i: number, p: Partial<TestQuestion>) => save({ questions: t.questions.map((q, j) => (j === i ? { ...q, ...p } : q)) })
  const scaleIds = t.kind === 'mbti' ? ['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P'] : t.scales.map((s) => s.id)
  const scaleName = (id: string) => t.scales.find((s) => s.id === id)?.name ?? id
  const results = db.users.filter((u) => u.testResults[t.id])

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 text-sm font-semibold text-muted">← Тесты</button>
      <Card className="mb-4 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Название"><Input value={t.title} onChange={(e) => save({ title: e.target.value })} /></Field>
        <Field label="Минут"><Input type="number" value={t.minutes} onChange={(e) => save({ minutes: Number(e.target.value) })} /></Field>
        <Field label="Описание" className="sm:col-span-2"><Input value={t.subtitle} onChange={(e) => save({ subtitle: e.target.value })} /></Field>
        <Toggle label="Тест включён" checked={t.enabled} onChange={(enabled) => save({ enabled })} />
        <Toggle label="Обязательный при регистрации" checked={!!t.mandatory} onChange={(mandatory) => save({ mandatory })} />
      </Card>
      <Tabs tabs={[{ id: 'questions', label: 'Вопросы', count: t.questions.length }, { id: 'scales', label: t.kind === 'mbti' ? 'Типы' : 'Шкалы', count: t.scales.length }, { id: 'results', label: 'Результаты', count: results.length }]} value={tab} onChange={setTab} />

      {tab === 'questions' && (
        <div className="space-y-2">
          <p className="text-xs text-muted">Каждый вопрос — шкала Лайкерта 1–5 (баллы идут выбранной шкале) или свои варианты ответа с весами по шкалам.</p>
          {t.questions.map((q, i) => (
            <Card key={q.id} className="space-y-2 p-4">
              <div className="flex gap-2">
                <span className="mt-3 w-6 text-sm text-muted">{i + 1}</span>
                <Input value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} />
                <button type="button" onClick={() => save({ questions: t.questions.filter((_, j) => j !== i) })} className="px-1 text-muted hover:text-danger" aria-label="Удалить"><Trash2 size={16} /></button>
              </div>
              {!q.options ? (
                <div className="flex flex-wrap items-center gap-2 pl-8">
                  <span className="text-xs text-muted">Шкала:</span>
                  <Select value={q.scale ?? ''} onChange={(e) => setQ(i, { scale: e.target.value })} className="!h-9 !w-auto text-xs" options={scaleIds.map((s) => ({ value: s, label: scaleName(s) }))} />
                  <button type="button" className="text-xs text-brand" onClick={() => setQ(i, { options: [{ label: 'Да', weights: { [scaleIds[0]]: 2 } }, { label: 'Нет', weights: { [scaleIds[1] ?? scaleIds[0]]: 2 } }] })}>→ свои варианты с весами</button>
                </div>
              ) : (
                <div className="space-y-1.5 pl-8">
                  {q.options.map((o, oi) => (
                    <div key={oi} className="flex flex-wrap items-center gap-2">
                      <Input className="!h-9 !w-48" value={o.label} onChange={(e) => setQ(i, { options: q.options!.map((x, k) => (k === oi ? { ...x, label: e.target.value } : x)) })} />
                      {scaleIds.map((s) => (
                        <label key={s} className="flex items-center gap-1 text-[11px] text-muted">
                          {s}
                          <input type="number" value={o.weights[s] ?? 0} onChange={(e) => setQ(i, { options: q.options!.map((x, k) => (k === oi ? { ...x, weights: { ...x.weights, [s]: Number(e.target.value) } } : x)) })} className="h-8 w-12 rounded-lg border border-line bg-surface px-1 text-xs" />
                        </label>
                      ))}
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <button type="button" className="text-xs text-brand" onClick={() => setQ(i, { options: [...q.options!, { label: 'Вариант', weights: {} }] })}>+ вариант</button>
                    <button type="button" className="text-xs text-muted" onClick={() => setQ(i, { options: undefined, scale: scaleIds[0] })}>← вернуть шкалу 1–5</button>
                  </div>
                </div>
              )}
            </Card>
          ))}
          <Button variant="secondary" onClick={() => save({ questions: [...t.questions, { id: uid('q'), text: 'Новый вопрос', scale: scaleIds[0] }] })}><Plus size={16} /> Вопрос</Button>
        </div>
      )}

      {tab === 'scales' && (
        <div className="space-y-2">
          {t.scales.map((s, i) => (
            <Card key={s.id} className="space-y-2 p-4">
              <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                <Input value={s.id} disabled />
                <Input value={s.name} onChange={(e) => save({ scales: t.scales.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              </div>
              <Textarea value={s.description} onChange={(e) => save({ scales: t.scales.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} className="!min-h-16" placeholder="Характеристика" />
              <Input value={s.strengths.join(', ')} onChange={(e) => save({ scales: t.scales.map((x, j) => (j === i ? { ...x, strengths: e.target.value.split(',').map((y) => y.trim()).filter(Boolean) } : x)) })} placeholder="Сильные стороны через запятую" />
              <Input value={s.roles.join(', ')} onChange={(e) => save({ scales: t.scales.map((x, j) => (j === i ? { ...x, roles: e.target.value.split(',').map((y) => y.trim()).filter(Boolean) } : x)) })} placeholder="Ниши (Business Assistant, Sales Manager…)" />
            </Card>
          ))}
          {t.kind === 'scales' && <Button variant="secondary" onClick={() => save({ scales: [...t.scales, { id: uid('s').slice(0, 8), name: 'Новая шкала', description: '', strengths: [], weaknesses: [], niche: '', roles: [], skills: [] }] })}><Plus size={16} /> Шкала</Button>}
        </div>
      )}

      {tab === 'results' && (
        <Table head={['Пользователь', 'Результат', 'Дата']}>
          {results.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar name={u.name} color={u.avatarColor} size={28} /> {u.name}</div></td>
              <td className="px-4 py-3 font-semibold">{u.testResults[t.id].summary}</td>
              <td className="px-4 py-3 text-muted">{dateLong(u.testResults[t.id].completedAt)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}
