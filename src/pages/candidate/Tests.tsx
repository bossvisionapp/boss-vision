import { ArrowLeft, Brain, CheckCircle2, Clock, Lock, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { VacancyCard } from '../../components/cards'
import { Badge, Button, Card, Chip, Empty, PageHeader, Progress, Ring, cx } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { scoreTest } from '../../data/tests'
import { matchScore, nicheRu } from '../../lib/match'
import type { TestDef } from '../../types'

const GRAD: Record<string, string> = {
  mbti: 'linear-gradient(135deg,#2a241f,#8a6a4d)',
  gallup: 'linear-gradient(135deg,#3b3025,#b08d57)',
  enneagram: 'linear-gradient(135deg,#2c2433,#7a6688)',
  ikigai: 'linear-gradient(135deg,#1f2a24,#5f7c6a)',
  career: 'linear-gradient(135deg,#1f2733,#4d6b8a)',
  softskills: 'linear-gradient(135deg,#33261f,#9b6b52)',
  responsibility: 'linear-gradient(135deg,#262626,#6f6259)',
  leadership: 'linear-gradient(135deg,#2b2320,#a97d5a)',
}
export const testGradient = (id: string) => GRAD[id] ?? 'linear-gradient(135deg,#2a241f,#8a6a4d)'

/** ТЗ п.8 — AI TESTS */
export default function Tests() {
  const { db } = useStore()
  const me = useMe()
  const [cat, setCat] = useState('')
  const tests = db.tests.filter((t) => t.enabled)
  const done = tests.filter((t) => me.testResults[t.id]).length
  const mbtiDone = !!me.testResults.mbti
  return (
    <div>
      <PageHeader title="AI-тесты" subtitle="Узнайте себя и свои сильные стороны — результаты сохраняются в профиле" />
      <Card className="mb-4 flex items-center gap-4">
        <Ring value={(done / Math.max(1, tests.length)) * 100} />
        <div>
          <p className="font-semibold">Ваш прогресс</p>
          <p className="text-sm text-muted">
            {done} из {tests.length} тестов пройдено
          </p>
          {!mbtiDone && <p className="mt-1 text-xs font-semibold text-gold">Начните с MBTI — он обязательный</p>}
        </div>
      </Card>
      <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto">
        {['', 'Личность', 'Профориентация', 'Навыки'].map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c || 'Все тесты'}
          </Chip>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {tests
          .filter((t) => !cat || t.category === cat)
          .map((t) => {
            const r = me.testResults[t.id]
            const locked = !mbtiDone && !t.mandatory
            return (
              <Link key={t.id} to={locked ? '/tests/mbti' : `/tests/${t.id}`}>
                <Card className={cx('flex h-full gap-4 transition hover:-translate-y-0.5', locked && 'opacity-60')}>
                  <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-3xl text-white" style={{ background: testGradient(t.id) }}>
                    {locked ? <Lock size={24} /> : <Brain size={28} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-lg font-semibold">{t.title}</p>
                      {t.mandatory && <Badge tone="warn">обязательный</Badge>}
                    </div>
                    <p className="line-clamp-2 text-[13px] text-muted">{t.subtitle}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Clock size={12} /> ~{t.minutes} мин · {t.questions.length} вопросов
                      </span>
                      {r && (
                        <Badge tone="success">
                          <CheckCircle2 size={11} /> {r.summary}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
      </div>
    </div>
  )
}

const ANSWERS = ['Совсем нет', 'Скорее нет', 'Иногда', 'Скорее да', 'Точно да']

export function TestRun() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { db, saveTestResult } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const test = db.tests.find((t) => t.id === id)
  const prev = test ? me.testResults[test.id] : undefined
  const [phase, setPhase] = useState<'intro' | 'run' | 'result'>(prev ? 'result' : 'intro')
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const first = params.get('first') === '1'

  if (!test || !test.enabled) return <Empty icon={<Brain />} title="Тест недоступен" />

  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-[30px] p-7 text-white lux-grain" style={{ background: testGradient(test.id) }}>
          {first && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] opacity-80">Шаг 2 из 2 · профиль создан ✓</p>}
          <Brain size={40} className="opacity-80" />
          <h1 className="mt-4 font-display text-4xl font-semibold">{test.title}</h1>
          <p className="mt-2 opacity-85">{test.subtitle}</p>
          <p className="mt-4 text-sm opacity-75">
            {test.questions.length} вопросов · ~{test.minutes} минут · отвечайте честно, правильных ответов нет
          </p>
        </div>
        <Button size="lg" className="mt-5 w-full" onClick={() => setPhase('run')}>
          Начать тест
        </Button>
        {first && (
          <Button variant="ghost" className="mt-2 w-full" onClick={() => nav('/home')}>
            Пройти позже
          </Button>
        )}
      </div>
    )
  }

  if (phase === 'result' && prev) return <TestResultView test={test} first={first} onRetake={() => { setAnswers({}); setIdx(0); setPhase('run') }} />

  const q = test.questions[idx]
  const answer = (val: number) => {
    const next = { ...answers, [q.id]: val }
    setAnswers(next)
    if (idx + 1 < test.questions.length) return setTimeout(() => setIdx(idx + 1), 160)
    const r = scoreTest(test, next)
    saveTestResult({ testId: test.id, title: test.title, completedAt: new Date().toISOString(), ...r })
    setPhase('result')
  }

  return (
    <div className="mx-auto max-w-xl">
      <button type="button" onClick={() => (idx > 0 ? setIdx(idx - 1) : setPhase('intro'))} className="mb-4 flex items-center gap-1 text-sm font-semibold text-muted">
        <ArrowLeft size={16} /> {idx > 0 ? 'Предыдущий вопрос' : test.title}
      </button>
      <div className="flex items-center gap-3">
        <Progress value={(idx / test.questions.length) * 100} gold />
        <span className="shrink-0 text-xs text-muted">
          {idx + 1}/{test.questions.length}
        </span>
      </div>
      <Card className="mt-5 p-6 fade-up" key={q.id}>
        <p className="font-display text-[22px] font-semibold leading-snug">{q.text}</p>
        <div className="mt-6 space-y-2">
          {(q.options ? q.options.map((o) => o.label) : ANSWERS).map((a, k) => {
            const val = q.options ? k : k + 1
            return (
              <button
                key={a}
                type="button"
                onClick={() => answer(val)}
                className={cx('flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left font-semibold transition hover:border-brand', answers[q.id] === val ? 'border-accent bg-surface-2' : 'border-line')}
              >
                <span className={cx('flex h-7 w-7 items-center justify-center rounded-full text-sm', answers[q.id] === val ? 'bg-accent text-on-accent' : 'bg-surface-2')}>{k + 1}</span>
                {a}
              </button>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

/** Результат теста (ТЗ п.8): характеристика, сильные/слабые стороны, ниша, профессии, рекомендации, вакансии, навыки */
function TestResultView({ test, first, onRetake }: { test: TestDef; first: boolean; onRetake: () => void }) {
  const { db } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const r = me.testResults[test.id]!
  const scale = test.scales.find((s) => s.id === r.top[0]) ?? test.scales[0]
  const second = test.kind === 'scales' ? test.scales.find((s) => s.id === r.top[1]) : undefined
  const resume = db.resumes.find((x) => x.userId === me.id)
  const vacancies = db.vacancies
    .filter((v) => v.status === 'active' && scale.roles.includes(v.category))
    .map((v) => ({ v, score: resume ? matchScore(v, resume, me, db.settings.weights).score : undefined }))
    .slice(0, 2)
  const max = Math.max(...Object.values(r.scores), 1)
  const bars = test.kind === 'mbti' ? [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']] : null

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-[30px] p-7 text-white lux-grain fade-up" style={{ background: testGradient(test.id) }}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-75">{test.title} · ваш результат</p>
        <h1 className="mt-2 font-display text-[40px] font-semibold leading-none">{test.kind === 'mbti' ? r.summary : scale.name}</h1>
        {test.kind === 'mbti' && <p className="mt-1 font-display text-xl opacity-90">{scale.name.split('—')[1]}</p>}
        <p className="mt-3 max-w-md opacity-90">{scale.description}</p>
        {second && <p className="mt-2 text-sm opacity-75">Вторая ведущая шкала: {second.name}</p>}
      </div>

      <Card className="space-y-3 p-5">
        {bars
          ? bars.map(([a, b]) => {
              const sa = r.scores[a] ?? 0
              const sb = r.scores[b] ?? 0
              const pct = Math.round((sa / Math.max(1, sa + sb)) * 100)
              return (
                <div key={a}>
                  <div className="mb-1 flex justify-between text-xs font-bold">
                    <span className={pct >= 50 ? 'text-ink' : 'text-muted'}>{a} {pct}%</span>
                    <span className={pct < 50 ? 'text-ink' : 'text-muted'}>{100 - pct}% {b}</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="bg-gold" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })
          : test.scales.map((s) => (
              <div key={s.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className={cx('font-semibold', r.top.includes(s.id) ? 'text-ink' : 'text-muted')}>{s.name}</span>
                  <span className="text-muted">{r.scores[s.id] ?? 0}</span>
                </div>
                <Progress value={((r.scores[s.id] ?? 0) / max) * 100} gold={r.top.includes(s.id)} />
              </div>
            ))}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-[11px] font-bold uppercase tracking-widest text-success">Сильные стороны</p>
          <ul className="mt-2 space-y-1 text-sm">{scale.strengths.map((x) => <li key={x}>✓ {x}</li>)}</ul>
        </Card>
        <Card>
          <p className="text-[11px] font-bold uppercase tracking-widest text-warn">Слабые стороны</p>
          <ul className="mt-2 space-y-1 text-sm">{scale.weaknesses.map((x) => <li key={x}>• {x}</li>)}</ul>
        </Card>
        <Card>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Подходящая ниша</p>
          <p className="mt-2 font-semibold">{scale.niche}</p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-muted">Профессии</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{scale.roles.map((x) => <Badge key={x} tone="brand">{nicheRu(x)}</Badge>)}</div>
        </Card>
        <Card>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Какие навыки развивать</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{scale.skills.map((x) => <Badge key={x}>{x}</Badge>)}</div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-muted">Рекомендация</p>
          <p className="mt-1 text-sm">Опирайтесь на «{scale.strengths[0]}» в резюме и на собеседовании; закройте зону роста «{scale.weaknesses[0]}» через Academy.</p>
        </Card>
      </div>

      {vacancies.length > 0 && (
        <div>
          <p className="mb-2 font-display text-lg font-semibold">Подходящие вакансии</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {vacancies.map(({ v, score }) => <VacancyCard key={v.id} v={v} score={score} />)}
          </div>
        </div>
      )}

      <p className="flex items-center gap-2 text-sm text-muted">
        <Sparkles size={15} className="text-gold" /> Результат сохранён в профиле и используется AI Matching.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => nav(first ? '/home' : '/tests')}>{first ? 'Перейти на главную' : 'Другие тесты'}</Button>
        <Button variant="secondary" onClick={() => nav('/profile#ai')}>AI Career Profile</Button>
        <Button variant="ghost" onClick={onRetake}>Пройти заново</Button>
      </div>
    </div>
  )
}
