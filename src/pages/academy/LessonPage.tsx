import { ArrowLeft, ArrowRight, CheckCircle2, Circle, FileText, HelpCircle, Lock, Paperclip, Play, Sheet } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, Badge, Button, Card, Empty, Modal, Tabs, Textarea, cx } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { ANSWER_STATUS_LABEL, ANSWER_TONE, readFileAsDataUrl, timeAgo } from '../../lib/format'
import type { Attachment } from '../../types'
import { flatLessons, lessonState } from './Academy'

export function youtubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  return m?.[1] ?? (/^[\w-]{11}$/.test(url.trim()) ? url.trim() : null)
}

/** ТЗ п.21 — урок: Видео → Описание → Материалы → Домашнее задание → Файлы → Чек-лист → Задать вопрос → Урок пройден */
export default function LessonPage() {
  const { courseId, lessonId } = useParams()
  const { db, toggleLesson, submitAnswer, openSupport, sendMessage } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const c = db.courses.find((x) => x.id === courseId)
  const all = c ? flatLessons(c) : []
  const idx = all.findIndex((l) => l.id === lessonId)
  const l = all[idx]
  const [tab, setTab] = useState<'materials' | 'task' | 'quiz'>('materials')
  const [checked, setChecked] = useState<number[]>([])
  const [answer, setAnswer] = useState('')
  const [files, setFiles] = useState<Attachment[]>([])
  const [quiz, setQuiz] = useState<Record<number, number>>({})
  const [quizDone, setQuizDone] = useState(false)
  const [ask, setAsk] = useState(false)
  const [question, setQuestion] = useState('')
  const [asked, setAsked] = useState(false)

  if (!c || !l) return <Empty icon={<FileText />} title="Урок не найден" />
  const state = lessonState(db, me, c, l)
  if (state === 'locked' || state === 'stop') {
    return (
      <div className="mx-auto max-w-lg pt-10 text-center">
        <Lock size={40} className="mx-auto text-gold" />
        <p className="mt-3 font-display text-2xl font-semibold">{state === 'locked' ? 'Урок откроется после покупки' : 'Сначала сдайте задание стоп-урока'}</p>
        <p className="mt-1 text-muted">{state === 'locked' ? 'Бесплатные уроки доступны всем, остальные — после оплаты курса.' : 'Куратор проверит задание, и следующий урок откроется автоматически.'}</p>
        <Button className="mt-5" onClick={() => nav(`/academy/${c.id}`)}>{state === 'locked' ? 'Купить полный доступ' : 'К программе курса'}</Button>
      </div>
    )
  }

  const done = state === 'done'
  const my = db.answers.find((a) => a.userId === me.id && a.lessonId === l.id)
  const next = all[idx + 1]
  const prev = all[idx - 1]
  const yt = youtubeId(l.videoUrl)
  const modNo = c.modules.findIndex((m) => m.id === l.moduleId) + 1
  const lesNo = c.modules[modNo - 1].lessons.findIndex((x) => x.id === l.id) + 1

  const attach = async (list: FileList | null) => {
    if (!list) return
    const out: Attachment[] = []
    for (const f of Array.from(list).slice(0, 3)) if (f.size < 1.5 * 1024 * 1024) out.push({ name: f.name, type: f.type, dataUrl: await readFileAsDataUrl(f) })
    setFiles([...files, ...out])
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => nav(`/academy/${c.id}`)} className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft size={16} /> {c.title}
        </button>
        <span className="text-sm font-semibold text-muted">Урок {modNo}.{lesNo}</span>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-[26px] bg-hero lux-grain">
        {yt ? (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1&iv_load_policy=3`}
            title={l.title}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-on-hero">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur"><Play size={28} className="ml-1" /></span>
            <p className="mt-3 text-sm opacity-75">Видео урока · {l.minutes} мин</p>
            <p className="text-xs opacity-50">Админ добавляет ссылку YouTube / Kinescope в редакторе урока</p>
          </div>
        )}
      </div>
      {l.timecodes.length > 0 && (
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {l.timecodes.map((t) => <span key={t.time} className="shrink-0 rounded-full border border-line px-3 py-1 text-xs"><b>{t.time}</b> {t.label}</span>)}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">{l.moduleTitle}</p>
          <h1 className="font-display text-[26px] font-semibold leading-tight">{l.title}</h1>
        </div>
        <div className="flex gap-1.5">
          {l.isFree && <Badge tone="success">Бесплатный урок</Badge>}
          {l.isStop && <Badge tone="warn">Стоп-урок</Badge>}
          {done && <Badge tone="success"><CheckCircle2 size={11} /> Пройден</Badge>}
        </div>
      </div>
      <p className="mt-3 whitespace-pre-line leading-relaxed">{l.body}</p>

      <Card className="mt-5 p-5">
        <Tabs
          tabs={[
            { id: 'materials', label: 'Материалы', count: l.materials.length },
            { id: 'task', label: 'Задание' },
            { id: 'quiz', label: 'Тест', count: l.quiz.length },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'materials' && (
          <div className="space-y-2">
            {l.materials.length === 0 && <p className="text-sm text-muted">К этому уроку нет файлов.</p>}
            {l.materials.map((m) => (
              <a key={m.title} href={m.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-line p-3">
                {m.kind === 'Таблица' ? <Sheet className="text-success" /> : <FileText className="text-danger" />}
                <div className="flex-1">
                  <p className="text-sm font-semibold">{m.title}</p>
                  <p className="text-xs text-muted">{m.kind}</p>
                </div>
              </a>
            ))}
            {l.checklist.length > 0 && (
              <div className="pt-3">
                <p className="mb-2 text-sm font-semibold">Чек-лист урока</p>
                {l.checklist.map((x, i) => (
                  <button key={x} type="button" onClick={() => setChecked(checked.includes(i) ? checked.filter((k) => k !== i) : [...checked, i])} className="flex w-full items-center gap-2 py-1.5 text-left text-sm">
                    {checked.includes(i) ? <CheckCircle2 size={18} className="text-success" /> : <Circle size={18} className="text-muted" />}
                    <span className={checked.includes(i) ? 'text-muted line-through' : ''}>{x}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'task' && (
          <div className="space-y-3">
            {!l.assignment ? (
              <p className="text-sm text-muted">В этом уроке нет домашнего задания.</p>
            ) : (
              <>
                <div className="rounded-2xl bg-surface-2 p-4 text-sm"><b>Домашнее задание.</b> {l.assignment}</div>
                {my && (
                  <div className="space-y-2 rounded-2xl border border-line p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Ваш ответ · {timeAgo(my.createdAt)}</p>
                      <Badge tone={ANSWER_TONE[my.status]}>{ANSWER_STATUS_LABEL[my.status]}</Badge>
                    </div>
                    <p className="whitespace-pre-line text-sm">{my.text}</p>
                    {my.attachments.map((a) => <a key={a.name} href={a.dataUrl} download={a.name} className="block text-xs text-brand">📎 {a.name}</a>)}
                    {my.replies.map((r) => {
                      const au = db.users.find((u) => u.id === r.authorId)
                      return (
                        <div key={r.id} className="flex gap-2 rounded-2xl bg-brand-soft/60 p-3">
                          <Avatar name={au?.name ?? 'К'} color={au?.avatarColor ?? '#999'} size={28} />
                          <div className="text-sm">
                            <p className="text-xs font-bold">{au?.name} · куратор</p>
                            <p>{r.text}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {(!my || my.status === 'needs_revision') && (
                  <>
                    <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Ваш ответ куратору…" />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-line px-3 py-2 text-sm">
                        <Paperclip size={15} /> Файлы
                        <input type="file" multiple className="hidden" onChange={(e) => attach(e.target.files)} />
                      </label>
                      {files.map((f) => <span key={f.name} className="text-xs text-muted">📎 {f.name}</span>)}
                      <Button
                        className="ml-auto"
                        disabled={!answer.trim() && !files.length}
                        onClick={() => {
                          submitAnswer(c.id, l.id, answer, files)
                          setAnswer('')
                          setFiles([])
                        }}
                      >
                        Отправить на проверку
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'quiz' && (
          <div className="space-y-4">
            {l.quiz.length === 0 && <p className="text-sm text-muted">Теста к уроку нет.</p>}
            {l.quiz.map((q, qi) => (
              <div key={qi}>
                <p className="mb-2 font-semibold">{qi + 1}. {q.q}</p>
                {q.options.map((o, oi) => {
                  const picked = quiz[qi] === oi
                  const right = quizDone && oi === q.correct
                  const wrong = quizDone && picked && oi !== q.correct
                  return (
                    <button key={o} type="button" disabled={quizDone} onClick={() => setQuiz({ ...quiz, [qi]: oi })} className={cx('mb-1.5 flex w-full items-center gap-2 rounded-2xl border p-3 text-left text-sm', right ? 'border-success bg-success-soft' : wrong ? 'border-danger bg-danger-soft' : picked ? 'border-accent bg-surface-2' : 'border-line')}>
                      {o}
                    </button>
                  )
                })}
              </div>
            ))}
            {l.quiz.length > 0 && (
              quizDone ? (
                <p className="font-semibold">Результат: {l.quiz.filter((q, i) => quiz[i] === q.correct).length} из {l.quiz.length}</p>
              ) : (
                <Button disabled={Object.keys(quiz).length < l.quiz.length} onClick={() => setQuizDone(true)}>Проверить</Button>
              )
            )}
          </div>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setAsk(true)}>
          <HelpCircle size={16} /> Задать вопрос
        </Button>
        {!done && !l.isStop && (
          <Button onClick={() => toggleLesson(c.id, l.id, true)}>
            <CheckCircle2 size={16} /> Урок пройден
          </Button>
        )}
        {!done && l.isStop && <p className="self-center text-sm text-warn">Стоп-урок засчитается после проверки задания куратором</p>}
      </div>

      <div className="mt-6 flex items-center justify-between gap-2 border-t border-line pt-4">
        {prev ? <Button variant="ghost" onClick={() => nav(`/academy/${c.id}/lesson/${prev.id}`)}><ArrowLeft size={16} /> Назад</Button> : <span />}
        {next && (
          <Button
            size="lg"
            onClick={() => {
              if (!done && !l.isStop) toggleLesson(c.id, l.id, true)
              nav(`/academy/${c.id}/lesson/${next.id}`)
            }}
          >
            Следующий урок <ArrowRight size={16} />
          </Button>
        )}
      </div>

      <Modal open={ask} onClose={() => { setAsk(false); setAsked(false) }} title="Вопрос куратору">
        {asked ? (
          <div className="text-center">
            <CheckCircle2 size={40} className="mx-auto text-success" />
            <p className="mt-2 text-muted">Вопрос отправлен. Ответ придёт в «Чаты → Поддержка».</p>
            <Button className="mt-4 w-full" onClick={() => nav('/chats')}>Открыть чат</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">{c.title} · {l.title}</p>
            <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ваш вопрос по уроку…" />
            <Button
              className="w-full"
              disabled={!question.trim()}
              onClick={() => {
                const t = openSupport('Вопросы по урокам')
                sendMessage(t, `❓ ${c.title} · урок «${l.title}»\n${question}`)
                setQuestion('')
                setAsked(true)
              }}
            >
              Отправить
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
