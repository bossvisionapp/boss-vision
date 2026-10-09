import { ArrowDown, ArrowUp, Award, Plus, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Badge, Button, Card, Chip, Field, Input, Modal, Select, Tabs, Textarea, Toggle, cx } from '../../components/ui'
import { notify, useMe, useStore } from '../../data/store'
import { lessonIds } from '../../data/courses'
import { ANSWER_STATUS_LABEL, ANSWER_TONE, dateLong, money, nowIso, readFileAsDataUrl, timeAgo, uid } from '../../lib/format'
import type { AnswerStatus, Course, CourseModule, Lesson } from '../../types'
import { Table } from './AdminShell'

// Academy в админке — перенос логики Learning Platform («Тренингтер»):
// список курсов → курс → вкладки «Содержание / Студенты / Настройки»; урок редактируется формой,
// задания учеников — в «Ленте ответов» со статусами и шаблонами (как в GetCourse).

const COVERS = [
  'linear-gradient(135deg,#3a2f27 0%,#8a6a4d 55%,#d8bf98 100%)',
  'linear-gradient(135deg,#2b2320 0%,#7a4f3a 55%,#e2b48c 100%)',
  'linear-gradient(135deg,#1f2a2a 0%,#3f6b5c 60%,#b9d3c4 100%)',
  'linear-gradient(135deg,#1f2733,#4b6178,#bfcbd8)',
  'linear-gradient(135deg,#2c2433,#6e5a7c,#d5c3dd)',
  'linear-gradient(135deg,#0b0a08,#6b5320,#e1bd6c)',
]

const emptyLesson = (): Lesson => ({ id: uid('l'), title: 'Новый урок', minutes: 10, videoUrl: '', body: '', assignment: '', checklist: [], materials: [], timecodes: [], quiz: [], isFree: false, isStop: false })

function useCourseUpdate() {
  const { update } = useStore()
  return (id: string, fn: (c: Course) => Course) => update((d) => ({ ...d, courses: d.courses.map((c) => (c.id === id ? fn(c) : c)) }))
}

export function AdminCourses() {
  const { db, update } = useStore()
  const [sel, setSel] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const course = db.courses.find((c) => c.id === sel)
  if (course) return <CourseEditor c={course} onBack={() => setSel(null)} />

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название нового курса" className="!w-auto flex-1" />
        <Button
          disabled={!title.trim()}
          onClick={() => {
            const id = uid('c')
            update((d) => ({
              ...d,
              courses: [...d.courses, { id, title: title.trim(), subtitle: '', description: '', teacher: { name: 'BOSS VISION', title: 'Academy' }, audience: 'all', category: 'Новое', price: 0, durationWeeks: 4, cover: COVERS[d.courses.length % COVERS.length], features: [], certificate: true, published: false, comingSoon: false, modules: [{ id: uid('m'), title: 'Модуль 1', lessons: [emptyLesson()] }], createdAt: nowIso() }],
            }))
            setTitle('')
            setSel(id)
          }}
        >
          <Plus size={16} /> Создать и открыть
        </Button>
      </div>
      <Table head={['Курс', 'Уроки', 'Студенты', 'Цена', 'Статус', '']}>
        {db.courses.map((c) => (
          <tr key={c.id} className="hover:bg-surface-2/50">
            <td className="cursor-pointer px-4 py-3" onClick={() => setSel(c.id)}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl" style={{ background: c.cover }} />
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-xs text-muted">{c.subtitle}</p>
                </div>
              </div>
            </td>
            <td className="px-4 py-3 text-muted">{c.modules.length} мод. · {lessonIds(c).length}</td>
            <td className="px-4 py-3 text-muted">{db.enrollments.filter((e) => e.courseId === c.id).length}</td>
            <td className="px-4 py-3">{c.price ? money(c.price) : 'Бесплатно'}</td>
            <td className="px-4 py-3">{c.comingSoon ? <Badge tone="info">Скоро</Badge> : c.published ? <Badge tone="success">Опубликован</Badge> : <Badge>Черновик</Badge>}</td>
            <td className="px-4 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => setSel(c.id)}>Открыть →</Button></td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

function CourseEditor({ c, onBack }: { c: Course; onBack: () => void }) {
  const [tab, setTab] = useState<'content' | 'students' | 'settings'>('content')
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 text-sm font-semibold text-muted hover:text-ink">← Курсы</button>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl" style={{ background: c.cover }} />
        <div>
          <p className="font-display text-2xl font-semibold">{c.title}</p>
          <Link to={`/academy/${c.id}`} className="text-xs text-brand underline">Открыть как ученик</Link>
        </div>
      </div>
      <Tabs tabs={[{ id: 'content', label: 'Содержание' }, { id: 'students', label: 'Студенты' }, { id: 'settings', label: 'Настройки' }]} value={tab} onChange={setTab} />
      {tab === 'content' && <ContentTab c={c} />}
      {tab === 'students' && <StudentsTab c={c} />}
      {tab === 'settings' && <SettingsTab c={c} />}
    </div>
  )
}

function ContentTab({ c }: { c: Course }) {
  const save = useCourseUpdate()
  const [edit, setEdit] = useState<{ m: string; l: Lesson } | null>(null)
  const setModules = (modules: CourseModule[]) => save(c.id, (x) => ({ ...x, modules }))
  const move = <T,>(arr: T[], i: number, d: number) => {
    const a = [...arr]
    const j = i + d
    if (j < 0 || j >= a.length) return a
    ;[a[i], a[j]] = [a[j], a[i]]
    return a
  }

  return (
    <div className="space-y-3">
      {c.modules.map((m, mi) => (
        <Card key={m.id} className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-on-accent">{mi + 1}</span>
            <input defaultValue={m.title} onBlur={(e) => setModules(c.modules.map((x) => (x.id === m.id ? { ...x, title: e.target.value } : x)))} className="flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1 font-semibold outline-none hover:border-line focus:border-brand" />
            <button type="button" onClick={() => setModules(move(c.modules, mi, -1))} className="p-1 text-muted" aria-label="Выше"><ArrowUp size={15} /></button>
            <button type="button" onClick={() => setModules(move(c.modules, mi, 1))} className="p-1 text-muted" aria-label="Ниже"><ArrowDown size={15} /></button>
            <button type="button" onClick={() => confirm('Удалить модуль со всеми уроками?') && setModules(c.modules.filter((x) => x.id !== m.id))} className="p-1 text-muted hover:text-danger" aria-label="Удалить"><Trash2 size={15} /></button>
          </div>
          <div className="divide-y divide-line/70">
            {m.lessons.map((l, li) => (
              <div key={l.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="w-8 text-muted">{mi + 1}.{li + 1}</span>
                <button type="button" onClick={() => setEdit({ m: m.id, l })} className="flex-1 text-left hover:text-brand">
                  {l.title} {l.isFree && <Badge tone="success">бесплатный</Badge>} {l.isStop && <Badge tone="warn">🛑 стоп</Badge>} {l.assignment && <Badge>задание</Badge>} {l.videoUrl && <Badge tone="info">видео</Badge>}
                </button>
                <button type="button" onClick={() => setModules(c.modules.map((x) => (x.id === m.id ? { ...x, lessons: move(x.lessons, li, -1) } : x)))} className="p-1 text-muted" aria-label="Выше"><ArrowUp size={14} /></button>
                <button type="button" onClick={() => setModules(c.modules.map((x) => (x.id === m.id ? { ...x, lessons: move(x.lessons, li, 1) } : x)))} className="p-1 text-muted" aria-label="Ниже"><ArrowDown size={14} /></button>
                <Button size="sm" variant="ghost" onClick={() => setEdit({ m: m.id, l })}>Изменить</Button>
              </div>
            ))}
          </div>
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => { const l = emptyLesson(); setModules(c.modules.map((x) => (x.id === m.id ? { ...x, lessons: [...x.lessons, l] } : x))); setEdit({ m: m.id, l }) }}>
            <Plus size={14} /> Урок
          </Button>
        </Card>
      ))}
      <Button variant="secondary" onClick={() => setModules([...c.modules, { id: uid('m'), title: `Модуль ${c.modules.length + 1}`, lessons: [] }])}><Plus size={16} /> Модуль</Button>
      {edit && <LessonForm c={c} moduleId={edit.m} lesson={edit.l} onClose={() => setEdit(null)} />}
    </div>
  )
}

/** Форма урока — поля как в Learning Platform: видео, текст, задание, материалы (ссылка или загрузка), тайм-коды, тест, бесплатный/стоп */
function LessonForm({ c, moduleId, lesson, onClose }: { c: Course; moduleId: string; lesson: Lesson; onClose: () => void }) {
  const save = useCourseUpdate()
  const [l, setL] = useState<Lesson>(lesson)
  const [checklist, setChecklist] = useState(lesson.checklist.join('\n'))
  const [targetModule, setTargetModule] = useState(moduleId)
  const set = (p: Partial<Lesson>) => setL({ ...l, ...p })
  const submit = () => {
    const next = { ...l, checklist: checklist.split('\n').map((x) => x.trim()).filter(Boolean) }
    // урок можно перенести в другой модуль: убираем из остальных, обновляем/добавляем в выбранный
    save(c.id, (x) => ({
      ...x,
      modules: x.modules.map((m) => {
        if (m.id !== targetModule) return { ...m, lessons: m.lessons.filter((y) => y.id !== next.id) }
        const has = m.lessons.some((y) => y.id === next.id)
        return { ...m, lessons: has ? m.lessons.map((y) => (y.id === next.id ? next : y)) : [...m.lessons, next] }
      }),
    }))
    onClose()
  }
  const remove = () => {
    save(c.id, (x) => ({ ...x, modules: x.modules.map((m) => ({ ...m, lessons: m.lessons.filter((y) => y.id !== l.id) })) }))
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Урок" wide>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <Field label="Название"><Input value={l.title} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Минут"><Input type="number" value={l.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Модуль"><Select value={targetModule} onChange={(e) => setTargetModule(e.target.value)} options={c.modules.map((m) => ({ value: m.id, label: m.title }))} /></Field>
        <Field label="Видео — ссылка YouTube / Kinescope" hint="Ученики не видят саму ссылку, только плеер"><Input value={l.videoUrl} onChange={(e) => set({ videoUrl: e.target.value })} placeholder="https://youtu.be/…" /></Field>
        <Field label="Описание урока"><Textarea value={l.body} onChange={(e) => set({ body: e.target.value })} /></Field>
        <Field label="Домашнее задание" hint="Ответы учеников придут в «Задания учеников»"><Textarea value={l.assignment} onChange={(e) => set({ assignment: e.target.value })} className="!min-h-20" /></Field>
        <Field label="Чек-лист (каждый пункт с новой строки)"><Textarea value={checklist} onChange={(e) => setChecklist(e.target.value)} className="!min-h-20" /></Field>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold">Материалы и файлы (PDF, таблицы, скрипты)</p>
          {l.materials.map((m, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <Input className="!w-28" value={m.kind} onChange={(e) => set({ materials: l.materials.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)) })} />
              <Input value={m.title} placeholder="Название" onChange={(e) => set({ materials: l.materials.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
              <Input value={m.url.startsWith('data:') ? '📎 загруженный файл' : m.url} placeholder="Ссылка" onChange={(e) => set({ materials: l.materials.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
              <button type="button" onClick={() => set({ materials: l.materials.filter((_, j) => j !== i) })} className="px-1 text-muted hover:text-danger" aria-label="Удалить"><Trash2 size={16} /></button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => set({ materials: [...l.materials, { kind: 'PDF', title: '', url: '' }] })}><Plus size={14} /> Ссылка</Button>
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-2xl border border-line px-3 text-[13px] font-semibold">
              <Upload size={14} /> Загрузить файл
              <input type="file" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                if (f.size > 2 * 1024 * 1024) return alert('Демо: файл до 2 МБ. В проде — хранилище Supabase Storage.')
                set({ materials: [...l.materials, { kind: f.name.split('.').pop()?.toUpperCase() ?? 'Файл', title: f.name, url: await readFileAsDataUrl(f) }] })
              }} />
            </label>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold">Тайм-коды</p>
          {l.timecodes.map((t, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <Input className="!w-24" value={t.time} onChange={(e) => set({ timecodes: l.timecodes.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)) })} />
              <Input value={t.label} onChange={(e) => set({ timecodes: l.timecodes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <button type="button" onClick={() => set({ timecodes: l.timecodes.filter((_, j) => j !== i) })} className="px-1 text-muted hover:text-danger" aria-label="Удалить"><Trash2 size={16} /></button>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => set({ timecodes: [...l.timecodes, { time: '0:00', label: '' }] })}><Plus size={14} /> Тайм-код</Button>
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold">Тест к уроку</p>
          {l.quiz.map((q, qi) => (
            <div key={qi} className="mb-2 space-y-2 rounded-2xl border border-line p-3">
              <div className="flex gap-2">
                <Input value={q.q} placeholder="Вопрос" onChange={(e) => set({ quiz: l.quiz.map((x, j) => (j === qi ? { ...x, q: e.target.value } : x)) })} />
                <button type="button" onClick={() => set({ quiz: l.quiz.filter((_, j) => j !== qi) })} className="px-1 text-muted hover:text-danger" aria-label="Удалить"><Trash2 size={16} /></button>
              </div>
              {q.options.map((o, oi) => (
                <label key={oi} className="flex items-center gap-2">
                  <input type="radio" checked={q.correct === oi} onChange={() => set({ quiz: l.quiz.map((x, j) => (j === qi ? { ...x, correct: oi } : x)) })} title="Правильный ответ" />
                  <Input value={o} onChange={(e) => set({ quiz: l.quiz.map((x, j) => (j === qi ? { ...x, options: x.options.map((y, k) => (k === oi ? e.target.value : y)) } : x)) })} />
                </label>
              ))}
              <Button size="sm" variant="ghost" onClick={() => set({ quiz: l.quiz.map((x, j) => (j === qi ? { ...x, options: [...x.options, ''] } : x)) })}>+ вариант</Button>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => set({ quiz: [...l.quiz, { q: '', options: ['', ''], correct: 0 }] })}><Plus size={14} /> Вопрос</Button>
        </div>

        <Toggle label="Бесплатный урок (открыт без покупки)" checked={l.isFree} onChange={(isFree) => set({ isFree })} />
        <Toggle label="Стоп-урок (следующий откроется после принятия задания)" checked={l.isStop} onChange={(isStop) => set({ isStop })} />
        <div className="flex gap-2 pt-2">
          <Button className="flex-1" onClick={submit}>Сохранить урок</Button>
          <Button variant="danger" onClick={() => confirm('Удалить урок?') && remove()}><Trash2 size={16} /></Button>
        </div>
      </div>
    </Modal>
  )
}

function StudentsTab({ c }: { c: Course }) {
  const { db, update, grantCourse, revokeCourse } = useStore()
  const [uidSel, setUidSel] = useState('')
  const all = lessonIds(c)
  const students = db.users.filter((u) => db.enrollments.some((e) => e.userId === u.id && e.courseId === c.id) || (u.courseProgress[c.id]?.length ?? 0) > 0)
  const issue = (userId: string) =>
    update((d) => {
      if (d.certificates.some((x) => x.userId === userId && x.courseId === c.id)) return d
      const next = { ...d, certificates: [...d.certificates, { id: uid('cert'), number: `BV-${new Date().getFullYear()}-${String(d.certificates.length + 148).padStart(4, '0')}`, userId, courseId: c.id, title: `${c.title} — ${c.subtitle}`, issuedAt: nowIso() }] }
      return notify(next, userId, `🏆 Вам выдан сертификат «${c.title}»`, '/certificates')
    })
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={uidSel} onChange={(e) => setUidSel(e.target.value)} className="!w-auto flex-1" options={[{ value: '', label: 'Выдать доступ пользователю…' }, ...db.users.filter((u) => u.role === 'candidate' && !students.includes(u)).map((u) => ({ value: u.id, label: `${u.name} · ${u.email}` }))]} />
        <Button disabled={!uidSel} onClick={() => { grantCourse(uidSel, c.id); setUidSel('') }}>Выдать</Button>
      </div>
      <Table head={['Студент', 'Прогресс', 'Задания', 'Сертификат', '']}>
        {students.map((u) => {
          const done = u.courseProgress[c.id]?.length ?? 0
          const pct = Math.round((done / Math.max(1, all.length)) * 100)
          const ans = db.answers.filter((a) => a.userId === u.id && a.courseId === c.id)
          const cert = db.certificates.find((x) => x.userId === u.id && x.courseId === c.id)
          return (
            <tr key={u.id}>
              <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar name={u.name} color={u.avatarColor} size={30} /> <span className="font-semibold">{u.name}</span></div></td>
              <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-gold" style={{ width: `${pct}%` }} /></div><span className="text-xs">{pct}% · {done}/{all.length}</span></div></td>
              <td className="px-4 py-3 text-xs text-muted">{ans.length} · ждут {ans.filter((a) => a.status === 'pending').length}</td>
              <td className="px-4 py-3">{cert ? <Badge tone="warn">№{cert.number}</Badge> : <Button size="sm" variant="ghost" onClick={() => issue(u.id)}><Award size={14} /> Выдать</Button>}</td>
              <td className="px-4 py-3 text-right"><button type="button" onClick={() => revokeCourse(u.id, c.id)} className="text-xs font-semibold text-danger">Закрыть доступ</button></td>
            </tr>
          )
        })}
      </Table>
    </div>
  )
}

function SettingsTab({ c }: { c: Course }) {
  const save = useCourseUpdate()
  const [f, setF] = useState({ ...c, features: c.features.join('\n') })
  const [ok, setOk] = useState(false)
  return (
    <Card className="space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Название"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Подзаголовок"><Input value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} /></Field>
        <Field label="Преподаватель"><Input value={f.teacher.name} onChange={(e) => setF({ ...f, teacher: { ...f.teacher, name: e.target.value } })} /></Field>
        <Field label="Регалии преподавателя"><Input value={f.teacher.title} onChange={(e) => setF({ ...f, teacher: { ...f.teacher, title: e.target.value } })} /></Field>
        <Field label="Цена, ₸"><Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></Field>
        <Field label="Старая цена, ₸"><Input type="number" value={f.oldPrice ?? ''} onChange={(e) => setF({ ...f, oldPrice: Number(e.target.value) || undefined })} /></Field>
        <Field label="Длительность, недель"><Input type="number" value={f.durationWeeks} onChange={(e) => setF({ ...f, durationWeeks: Number(e.target.value) })} /></Field>
        <Field label="Аудитория"><Select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value as Course['audience'] })} options={[{ value: 'all', label: 'Все' }, { value: 'candidate', label: 'Кандидаты' }, { value: 'employer', label: 'Предприниматели' }]} /></Field>
      </div>
      <Field label="Описание"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <Field label="Что получит ученик (каждый пункт с новой строки)"><Textarea value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} /></Field>
      <div>
        <p className="mb-1.5 text-[13px] font-semibold">Обложка</p>
        <div className="flex flex-wrap gap-2">{COVERS.map((cv) => <button key={cv} type="button" onClick={() => setF({ ...f, cover: cv })} className={cx('h-10 w-16 rounded-xl border-2', f.cover === cv ? 'border-gold' : 'border-transparent')} style={{ background: cv }} />)}</div>
      </div>
      <Toggle label="Выдавать сертификат после прохождения" checked={f.certificate} onChange={(certificate) => setF({ ...f, certificate })} />
      <Toggle label="Опубликован" checked={f.published} onChange={(published) => setF({ ...f, published })} />
      <Toggle label="Показывать как «Скоро»" checked={f.comingSoon} onChange={(comingSoon) => setF({ ...f, comingSoon })} />
      <div className="flex items-center gap-3">
        <Button onClick={() => { save(c.id, () => ({ ...f, features: f.features.split('\n').map((x) => x.trim()).filter(Boolean) })); setOk(true); setTimeout(() => setOk(false), 1800) }}>Сохранить</Button>
        {ok && <span className="text-sm text-success">Сохранено ✓</span>}
      </div>
    </Card>
  )
}

/** «Лента ответов» — проверка домашних заданий (Learning Platform → GetCourse-стиль). Горячие клавиши: J/K — навигация, A — принять, R — на доработку */
export function AdminAnswers() {
  const { db, replyAnswer, setAnswerStatus } = useStore()
  const me = useMe()
  const [status, setStatus] = useState<AnswerStatus | 'all'>('pending')
  const [course, setCourse] = useState('all')
  const [sel, setSel] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const lessonTitle = (cid: string, lid: string) => db.courses.find((c) => c.id === cid)?.modules.flatMap((m) => m.lessons).find((l) => l.id === lid)?.title ?? 'урок'
  const list = useMemo(() => db.answers.filter((a) => (status === 'all' || a.status === status) && (course === 'all' || a.courseId === course)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db.answers, status, course])
  const cur = list.find((a) => a.id === sel) ?? list[0]
  const idx = cur ? list.indexOf(cur) : -1

  const decide = (s: AnswerStatus) => {
    if (!cur) return
    if (draft.trim()) replyAnswer(cur.id, draft)
    setDraft('')
    setAnswerStatus(cur.id, s)
    setSel(list[idx + 1]?.id ?? list[idx - 1]?.id ?? null) // конвейер проверки
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT' || !cur) return
      if (e.key === 'j') setSel(list[idx + 1]?.id ?? cur.id)
      if (e.key === 'k') setSel(list[idx - 1]?.id ?? cur.id)
      if (e.key === 'a') decide('accepted')
      if (e.key === 'r') decide('needs_revision')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(['pending', 'needs_revision', 'accepted', 'no_review_needed', 'all'] as const).map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{s === 'all' ? 'Все' : ANSWER_STATUS_LABEL[s]} · {db.answers.filter((a) => s === 'all' || a.status === s).length}</Chip>
        ))}
      </div>
      <Select value={course} onChange={(e) => setCourse(e.target.value)} className="mb-4 !w-auto" options={[{ value: 'all', label: 'Все курсы' }, ...db.courses.filter((c) => !c.comingSoon).map((c) => ({ value: c.id, label: c.title }))]} />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-2">
          {list.map((a) => {
            const u = db.users.find((x) => x.id === a.userId)
            return (
              <button key={a.id} type="button" onClick={() => setSel(a.id)} className={cx('w-full rounded-2xl border p-3 text-left', cur?.id === a.id ? 'border-gold bg-surface' : 'border-line bg-surface')}>
                <div className="flex items-center gap-2">
                  <Avatar name={u?.name ?? '?'} color={u?.avatarColor ?? '#999'} size={28} />
                  <span className="flex-1 truncate text-sm font-semibold">{u?.name}</span>
                  <span className="text-[10px] text-muted">{timeAgo(a.createdAt)}</span>
                </div>
                <p className="mt-1 truncate text-xs text-muted">{lessonTitle(a.courseId, a.lessonId)}</p>
              </button>
            )
          })}
          {list.length === 0 && <p className="text-sm text-muted">Нет заданий 🎉</p>}
        </div>
        {cur && (
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{db.users.find((u) => u.id === cur.userId)?.name}</p>
                <p className="text-xs text-muted">{db.courses.find((c) => c.id === cur.courseId)?.title} · {lessonTitle(cur.courseId, cur.lessonId)} · {dateLong(cur.createdAt)}</p>
              </div>
              <Badge tone={ANSWER_TONE[cur.status]}>{ANSWER_STATUS_LABEL[cur.status]}</Badge>
            </div>
            <div className="whitespace-pre-line rounded-2xl bg-surface-2 p-4 text-sm">{cur.text}</div>
            {cur.attachments.map((f) => <a key={f.name} href={f.dataUrl} download={f.name} className="block text-sm text-brand">📎 {f.name}</a>)}
            {cur.replies.map((r) => <p key={r.id} className="rounded-2xl bg-brand-soft/60 p-3 text-sm"><b>{db.users.find((u) => u.id === r.authorId)?.name}:</b> {r.text}</p>)}
            <div className="flex flex-wrap gap-1.5">
              {db.settings.replyTemplates.map((t) => <button key={t} type="button" onClick={() => setDraft(t)} className="rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-muted hover:text-ink">{t.slice(0, 34)}…</button>)}
            </div>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Комментарий куратора (${me.name})…`} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => decide('accepted')}>Принять (A)</Button>
              <Button variant="soft" onClick={() => decide('needs_revision')}>На доработку (R)</Button>
              <Button variant="secondary" disabled={!draft.trim()} onClick={() => { replyAnswer(cur.id, draft); setDraft('') }}>Только ответить</Button>
              <Button variant="ghost" onClick={() => decide('no_review_needed')}>Без проверки</Button>
            </div>
            <p className="text-[11px] text-muted">J / K — следующий / предыдущий ответ</p>
          </Card>
        )}
      </div>
    </div>
  )
}

export function AdminCertificates() {
  const { db, update } = useStore()
  return (
    <Table head={['№', 'Студент', 'Курс', 'Дата', '']}>
      {db.certificates.map((c) => (
        <tr key={c.id}>
          <td className="px-4 py-3 font-semibold">{c.number}</td>
          <td className="px-4 py-3">{db.users.find((u) => u.id === c.userId)?.name}</td>
          <td className="px-4 py-3 text-muted">{c.title}</td>
          <td className="px-4 py-3 text-muted">{dateLong(c.issuedAt)}</td>
          <td className="px-4 py-3 text-right">
            <Link to={`/certificates/${c.id}`} className="mr-3 text-xs text-brand">Открыть</Link>
            <button type="button" onClick={() => confirm('Аннулировать сертификат?') && update((d) => ({ ...d, certificates: d.certificates.filter((x) => x.id !== c.id) }))} className="text-xs text-danger">Аннулировать</button>
          </td>
        </tr>
      ))}
    </Table>
  )
}
