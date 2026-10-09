import { Award, BookOpen, CheckCircle2, Circle, Clock, GraduationCap, Lock, PlayCircle, Star, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Checkout } from '../../components/Checkout'
import { Logo } from '../../components/Logo'
import { Badge, Button, Card, Empty, Progress, Tabs, cx } from '../../components/ui'
import { hasCourseAccess, useMe, useStore } from '../../data/store'
import { lessonIds } from '../../data/courses'
import { dateLong, money, plural } from '../../lib/format'
import type { Course, DB, Lesson, User } from '../../types'

/* ───────── правила доступа к урокам (как в Learning Platform) ───────── */

export function flatLessons(c: Course) {
  return c.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title })))
}

/** done — пройден; open — доступен; locked — нужна покупка; stop — ждёт принятия задания стоп-урока */
export function lessonState(db: DB, u: User, c: Course, l: Lesson): 'done' | 'open' | 'locked' | 'stop' {
  if (u.courseProgress[c.id]?.includes(l.id)) return 'done'
  const access = hasCourseAccess(db, u, c)
  if (!access && !l.isFree) return 'locked'
  if (u.role === 'admin' || u.role === 'curator') return 'open'
  const all = flatLessons(c)
  const idx = all.findIndex((x) => x.id === l.id)
  for (let i = 0; i < idx; i++) {
    const prev = all[i]
    if (prev.isStop && !u.courseProgress[c.id]?.includes(prev.id)) {
      const ans = db.answers.find((a) => a.userId === u.id && a.lessonId === prev.id)
      if (ans?.status !== 'accepted') return 'stop'
    }
  }
  return 'open'
}

export function coursePct(u: User, c: Course) {
  const n = lessonIds(c).length
  return n ? Math.round(((u.courseProgress[c.id]?.length ?? 0) / n) * 100) : 0
}

/** ТЗ п.18 — BOSS VISION ACADEMY */
export default function Academy() {
  const { db } = useStore()
  const me = useMe()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'all' | 'my' | 'certs'>((params.get('tab') as 'my') ?? 'all')
  const courses = db.courses.filter((c) => c.published && (me.role !== 'employer' || c.audience !== 'candidate'))
  const mine = courses.filter((c) => !c.comingSoon && ((me.courseProgress[c.id]?.length ?? 0) > 0 || db.enrollments.some((e) => e.userId === me.id && e.courseId === c.id)))
  const certs = db.certificates.filter((c) => c.userId === me.id)

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <Logo size="lg" />
          <p className="mt-1 font-display text-xl tracking-[0.3em] text-gold">ACADEMY</p>
        </div>
        <GraduationCap size={34} className="text-gold" strokeWidth={1.4} />
      </div>
      <Tabs
        tabs={[
          { id: 'all', label: 'Все курсы' },
          { id: 'my', label: 'Мой прогресс', count: mine.length },
          { id: 'certs', label: 'Сертификаты', count: certs.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'all' && (
        <div className="space-y-4">
          {courses.filter((c) => !c.comingSoon).map((c) => <CourseTile key={c.id} c={c} />)}
          <p className="pt-2 font-display text-lg font-semibold">Скоро в Academy</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {courses.filter((c) => c.comingSoon).map((c) => (
              <div key={c.id} className="relative overflow-hidden rounded-3xl p-4 text-white" style={{ background: c.cover }}>
                <Badge className="bg-white/20 text-white">Скоро</Badge>
                <p className="mt-6 font-display text-lg font-semibold">{c.title}</p>
                <p className="text-xs opacity-80">{c.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'my' && (
        <div className="space-y-3">
          {mine.map((c) => (
            <Link key={c.id} to={`/academy/${c.id}`}>
              <Card className="mb-3 flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 rounded-2xl" style={{ background: c.cover }} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-xs text-muted">{c.subtitle}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={coursePct(me, c)} gold />
                    <span className="text-xs font-bold">{coursePct(me, c)}%</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {mine.length === 0 && <Empty icon={<BookOpen />} title="Вы ещё не начали обучение" text="Первые уроки Mini Boss и Sales Boss — бесплатно" />}
        </div>
      )}

      {tab === 'certs' && <CertificateList />}
    </div>
  )
}

function CourseTile({ c }: { c: Course }) {
  const { db } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const access = hasCourseAccess(db, me, c)
  const pct = coursePct(me, c)
  const lessons = lessonIds(c).length
  return (
    <div className="relative overflow-hidden rounded-[30px] p-5 text-white lux-grain sm:p-6" style={{ background: c.cover }}>
      <div className="relative max-w-md">
        <div className="flex flex-wrap gap-1.5">
          {c.price === 0 ? <Badge className="bg-white/25 text-white">Бесплатно</Badge> : <Badge className="bg-white/25 text-white">{c.category}</Badge>}
          {c.certificate && <Badge className="bg-white/25 text-white">Сертификат</Badge>}
        </div>
        <p className="mt-3 font-display text-[28px] font-semibold leading-none">{c.title}</p>
        <p className="mt-1 opacity-90">{c.subtitle}</p>
        <p className="mt-2 text-xs opacity-75">
          {c.modules.length} {plural(c.modules.length, 'модуль', 'модуля', 'модулей')} · {lessons} уроков · {c.durationWeeks} нед. · ★ 4.9
        </p>
        {pct > 0 && (
          <div className="mt-3 flex max-w-xs items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} /></div>
            <span className="text-xs font-bold">{pct}%</span>
          </div>
        )}
        <Button className="mt-4 !bg-white !text-[#1e1a16]" onClick={() => nav(`/academy/${c.id}`)}>
          {pct > 0 ? 'Продолжить' : access ? 'Начать обучение' : `Подробнее · ${money(c.price)}`}
        </Button>
      </div>
    </div>
  )
}

/** ТЗ п.19–22 — карточка курса: программа, бесплатные уроки, прогресс модулей, покупка */
export function CourseDetail() {
  const { courseId } = useParams()
  const { db } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const [buy, setBuy] = useState(false)
  const c = db.courses.find((x) => x.id === courseId)
  if (!c) return <Empty icon={<GraduationCap />} title="Курс не найден" />
  const access = hasCourseAccess(db, me, c)
  const all = flatLessons(c)
  const pct = coursePct(me, c)
  const firstOpen = all.find((l) => ['open'].includes(lessonState(db, me, c, l)))
  const doneModules = c.modules.filter((m) => m.lessons.every((l) => me.courseProgress[c.id]?.includes(l.id))).length
  const cert = db.certificates.find((x) => x.userId === me.id && x.courseId === c.id)
  const free = all.filter((l) => l.isFree)

  return (
    <div className="mx-auto max-w-3xl">
      <button type="button" onClick={() => nav(-1)} className="mb-4 text-sm font-semibold text-muted hover:text-ink">← Academy</button>
      <div className="overflow-hidden rounded-[30px] p-6 text-white lux-grain sm:p-8" style={{ background: c.cover }}>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] opacity-80">BOSS VISION Academy</p>
        <h1 className="mt-2 font-display text-[38px] font-semibold leading-none">{c.title}</h1>
        <p className="mt-1 text-lg opacity-90">{c.subtitle}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-85">
          <span className="flex items-center gap-1"><UserRound size={14} /> {c.teacher.name}</span>
          <span className="flex items-center gap-1"><Clock size={14} /> {c.durationWeeks} недель</span>
          <span>{c.modules.length} модулей · {all.length} уроков</span>
          <span className="flex items-center gap-1"><Star size={14} className="fill-current" /> 4.9</span>
        </div>
        {access && all.length > 0 ? (
          <div className="mt-5">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} /></div>
              <span className="font-display text-xl font-semibold">{pct}%</span>
            </div>
            <p className="mt-1 text-sm opacity-80">{doneModules} / {c.modules.length} модулей</p>
            {firstOpen && (
              <Button className="mt-4 !bg-white !text-[#1e1a16]" onClick={() => nav(`/academy/${c.id}/lesson/${firstOpen.id}`)}>
                <PlayCircle size={17} /> {pct ? 'Продолжить обучение' : 'Начать обучение'}
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div>
              {c.oldPrice && <p className="text-sm line-through opacity-60">{money(c.oldPrice)}</p>}
              <p className="font-display text-3xl font-semibold">{money(c.price)}</p>
            </div>
            <Button className="!bg-white !text-[#1e1a16]" onClick={() => setBuy(true)}>Купить курс</Button>
            {free[0] && <Button variant="ghost" className="!text-white hover:!bg-white/10" onClick={() => nav(`/academy/${c.id}/lesson/${free[0].id}`)}>Бесплатный урок →</Button>}
          </div>
        )}
      </div>

      {cert && (
        <Link to={`/certificates/${cert.id}`} className="mt-4 flex items-center gap-3 rounded-3xl border border-gold/50 bg-surface p-4">
          <Award className="text-gold" /> <span className="flex-1 font-semibold">Сертификат получен — №{cert.number}</span> <span className="text-sm text-brand">Открыть →</span>
        </Link>
      )}

      <Card className="mt-4 space-y-3 p-5">
        <p className="leading-relaxed">{c.description}</p>
        {c.features.length > 0 && (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {c.features.map((f) => <li key={f} className="flex gap-2 text-sm"><CheckCircle2 size={17} className="shrink-0 text-gold" /> {f}</li>)}
          </ul>
        )}
        <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-display font-bold text-on-accent">{c.teacher.name[0]}</div>
          <div>
            <p className="text-sm font-semibold">{c.teacher.name}</p>
            <p className="text-xs text-muted">{c.teacher.title}</p>
          </div>
        </div>
      </Card>

      <p className="mb-3 mt-6 font-display text-xl font-semibold">Программа</p>
      <div className="space-y-2">
        {c.modules.map((m, mi) => {
          const states = m.lessons.map((l) => lessonState(db, me, c, l))
          const status = states.every((s) => s === 'done') ? 'done' : states.some((s) => s === 'done' || s === 'open') ? 'progress' : 'locked'
          return (
            <details key={m.id} className="group rounded-3xl border border-line bg-surface" open={status === 'progress'}>
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', status === 'done' ? 'bg-success text-white' : status === 'progress' ? 'bg-warn text-white' : 'bg-surface-2 text-muted')}>
                  {status === 'locked' ? <Lock size={14} /> : mi + 1}
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{m.title}</p>
                  <p className="text-xs text-muted">{m.lessons.length} {plural(m.lessons.length, 'урок', 'урока', 'уроков')} · {status === 'done' ? '🟢 завершён' : status === 'progress' ? '🟡 в процессе' : '🔒 закрыт'}</p>
                </div>
                <span className="text-muted transition group-open:rotate-180">⌄</span>
              </summary>
              <div className="border-t border-line px-2 pb-2">
                {m.lessons.map((l, li) => {
                  const s = states[li]
                  return (
                    <button
                      key={l.id}
                      type="button"
                      disabled={s === 'locked' || s === 'stop'}
                      onClick={() => nav(`/academy/${c.id}/lesson/${l.id}`)}
                      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left text-sm hover:bg-surface-2 disabled:opacity-55"
                    >
                      {s === 'done' ? <CheckCircle2 size={19} className="text-success" /> : s === 'open' ? <PlayCircle size={19} className="text-gold" /> : s === 'stop' ? <Circle size={19} className="text-warn" /> : <Lock size={17} className="text-muted" />}
                      <span className="flex-1">{l.title}</span>
                      {l.isFree && !access && <Badge tone="success">бесплатно</Badge>}
                      {s === 'stop' && <Badge tone="warn">после проверки</Badge>}
                      <span className="text-xs text-muted">{l.minutes} мин</span>
                    </button>
                  )
                })}
              </div>
            </details>
          )
        })}
      </div>

      {!access && (
        <div className="sticky bottom-20 z-20 mt-5 flex items-center gap-3 rounded-3xl border border-line bg-surface/95 p-3 backdrop-blur lg:bottom-4">
          <div className="flex-1 pl-2">
            <p className="text-xs text-muted">Полный доступ + сертификат</p>
            <p className="font-display text-xl font-semibold">{money(c.price)}</p>
          </div>
          <Button size="lg" onClick={() => setBuy(true)}>Купить полный доступ</Button>
        </div>
      )}

      <Checkout open={buy} onClose={() => setBuy(false)} product={{ type: 'course', refId: c.id, label: c.title, amount: c.price }} />
    </div>
  )
}

export function CertificateList() {
  const { db } = useStore()
  const me = useMe()
  const certs = db.certificates.filter((c) => c.userId === me.id)
  if (!certs.length) return <Empty icon={<Award />} title="Сертификатов пока нет" text="Пройдите курс полностью — сертификат появится в профиле автоматически" />
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {certs.map((c) => (
        <Link key={c.id} to={`/certificates/${c.id}`} className="rounded-3xl border border-gold/40 bg-surface p-5">
          <Award className="text-gold" size={28} />
          <p className="mt-2 font-display text-lg font-semibold">{c.title}</p>
          <p className="text-xs text-muted">№{c.number} · {dateLong(c.issuedAt)}</p>
        </Link>
      ))}
    </div>
  )
}

export function Certificates() {
  return (
    <div>
      <h1 className="mb-5 font-display text-[28px] font-semibold">Сертификаты</h1>
      <CertificateList />
    </div>
  )
}

/** ТЗ п.23 — BOSS VISION CERTIFICATE (печать в PDF) */
export function CertificateView() {
  const { id } = useParams()
  const { db } = useStore()
  const nav = useNavigate()
  const c = db.certificates.find((x) => x.id === id)
  if (!c) return <Empty icon={<Award />} title="Сертификат не найден" />
  const u = db.users.find((x) => x.id === c.userId)
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex justify-between">
        <button type="button" onClick={() => nav(-1)} className="text-sm font-semibold text-muted">← Назад</button>
        <Button size="sm" variant="secondary" onClick={() => window.print()}>Скачать PDF</Button>
      </div>
      <div className="print-area relative aspect-[1.414] overflow-hidden rounded-[18px] bg-[#fbf8f2] p-[6%] text-[#1e1a16] shadow-2xl">
        <div className="absolute inset-3 rounded-[12px] border border-[#b08d57]" />
        <div className="absolute inset-5 rounded-[10px] border border-[#b08d57]/40" />
        <div className="relative flex h-full flex-col items-center justify-between text-center">
          <div>
            <p className="font-display text-[clamp(18px,3.4vw,30px)] font-bold tracking-tight">BOSS VISION</p>
            <p className="mt-1 text-[clamp(8px,1.3vw,12px)] tracking-[0.4em] text-[#b08d57]">CERTIFICATE</p>
          </div>
          <div>
            <p className="text-[clamp(9px,1.5vw,14px)] italic text-[#8a7f71]">This certificate confirms that</p>
            <p className="my-2 font-display text-[clamp(22px,5vw,46px)] font-semibold">{u?.name}</p>
            <div className="mx-auto h-px w-2/3 bg-gradient-to-r from-transparent via-[#b08d57] to-transparent" />
            <p className="mt-3 text-[clamp(9px,1.5vw,14px)] italic text-[#8a7f71]">successfully completed</p>
            <p className="mt-1 font-display text-[clamp(14px,2.6vw,24px)] font-semibold">{c.title}</p>
          </div>
          <div className="flex w-full items-end justify-between text-[clamp(8px,1.2vw,11px)] text-[#8a7f71]">
            <div className="text-left">
              <p className="font-display text-[clamp(11px,1.8vw,16px)] italic text-[#1e1a16]">Анар Мырзан</p>
              <p>Founder, BOSS VISION</p>
            </div>
            <div className="flex h-[clamp(44px,8vw,76px)] w-[clamp(44px,8vw,76px)] items-center justify-center rounded-full border-2 border-[#b08d57] font-display text-[clamp(10px,1.8vw,16px)] font-bold text-[#b08d57]">BV</div>
            <div className="text-right">
              <p>№ {c.number}</p>
              <p>{dateLong(c.issuedAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
