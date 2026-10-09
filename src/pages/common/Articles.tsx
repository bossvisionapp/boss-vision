import { Bookmark, BookmarkCheck, Clock, Lightbulb, Newspaper, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Chip, Empty, PageHeader, Search } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { dateLong, timeAgo } from '../../lib/format'

export const NEWS_CATS = ['Бизнес', 'Маркетинг', 'Продажи', 'AI', 'HR', 'Стартапы', 'Инфобизнес', 'Карьера']
export const ADVICE_CATS = {
  employer: ['Команда', 'Маркетинг', 'Продажи', 'Системы', 'AI'],
  candidate: ['Личное развитие', 'Резюме', 'Поиск работы', 'Собеседование', 'AI'],
}

/** ТЗ п.41 — NEWS */
export function News() {
  const { db } = useStore()
  const [cat, setCat] = useState('')
  const list = db.articles.filter((a) => a.kind === 'news' && a.status === 'published' && (!cat || a.category === cat))
  const [hero, ...rest] = list
  return (
    <div>
      <PageHeader title="Новости" subtitle="Бизнес, маркетинг, продажи, AI, HR и карьера" />
      <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={!cat} onClick={() => setCat('')}>Все</Chip>
        {NEWS_CATS.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
      </div>
      {hero && (
        <Link to={`/articles/${hero.id}`} className="mb-4 block overflow-hidden rounded-[30px]">
          <div className="flex min-h-56 flex-col justify-end p-6 text-white lux-grain" style={{ background: hero.cover }}>
            <Badge className="w-fit bg-white/20 text-white">{hero.category}</Badge>
            <p className="mt-2 font-display text-2xl font-semibold leading-tight">{hero.title}</p>
            <p className="mt-1 text-sm opacity-80">{hero.excerpt}</p>
          </div>
        </Link>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {rest.map((a) => (
          <Link key={a.id} to={`/articles/${a.id}`} className="flex gap-3 rounded-3xl border border-line bg-surface p-3">
            <div className="h-24 w-24 shrink-0 rounded-2xl" style={{ background: a.cover }} />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gold">{a.category}</p>
              <p className="line-clamp-2 font-semibold leading-snug">{a.title}</p>
              <p className="mt-1 text-xs text-muted">{timeAgo(a.createdAt)} · {a.readMinutes} мин</p>
            </div>
          </Link>
        ))}
      </div>
      {list.length === 0 && <Empty icon={<Newspaper />} title="Новостей нет" />}
    </div>
  )
}

/** ТЗ п.43–44 — ADVICE, зависит от роли */
export function Advice() {
  const { db } = useStore()
  const me = useMe()
  const aud = me.role === 'employer' ? 'employer' : 'candidate'
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')
  const list = db.articles.filter(
    (a) => a.kind === 'advice' && a.status === 'published' && (a.audience === aud || a.audience === 'all') && (!cat || a.category === cat) && (!q || a.title.toLowerCase().includes(q.toLowerCase())),
  )
  return (
    <div>
      <PageHeader title="Советы" subtitle={aud === 'employer' ? 'База знаний предпринимателя' : 'База знаний для карьеры'} />
      <Search value={q} onChange={setQ} placeholder="Поиск советов…" />
      <div className="scrollbar-none -mx-4 my-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={!cat} onClick={() => setCat('')}>Все</Chip>
        {ADVICE_CATS[aud].map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
      </div>
      <div className="space-y-2">
        {list.map((a) => (
          <Link key={a.id} to={`/articles/${a.id}`} className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-gold"><Lightbulb size={20} /></div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{a.title}</p>
              <p className="text-xs text-muted">{a.category} · {a.readMinutes} мин чтения</p>
            </div>
          </Link>
        ))}
      </div>
      {list.length === 0 && <Empty icon={<Lightbulb />} title="Советов не найдено" />}
    </div>
  )
}

export function ArticleView() {
  const { id } = useParams()
  const { db, me, updateMe } = useStore()
  const nav = useNavigate()
  const [copied, setCopied] = useState(false)
  const a = db.articles.find((x) => x.id === id)
  if (!a) return <Empty icon={<Newspaper />} title="Материал не найден" />
  const saved = me?.savedNews.includes(a.id)
  return (
    <article className="mx-auto max-w-2xl">
      <button type="button" onClick={() => nav(-1)} className="mb-4 text-sm font-semibold text-muted hover:text-ink">← Назад</button>
      <div className="h-56 rounded-[30px] lux-grain" style={{ background: a.cover }} />
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{a.category}</Badge>
        <span className="flex items-center gap-1 text-xs text-muted"><Clock size={12} /> {a.readMinutes} мин · {dateLong(a.createdAt)}</span>
      </div>
      <h1 className="mt-2 font-display text-[32px] font-semibold leading-tight">{a.title}</h1>
      <p className="mt-3 text-lg text-muted">{a.excerpt}</p>
      <div className="lux-line my-6" />
      <div className="whitespace-pre-line text-[16px] leading-[1.75]">{a.body}</div>
      <p className="mt-6 text-sm text-muted">Источник: {a.source}</p>
      <div className="mt-5 flex gap-2">
        {me && (
          <Button variant="secondary" onClick={() => updateMe({ savedNews: saved ? me.savedNews.filter((x) => x !== a.id) : [...me.savedNews, a.id] })}>
            {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />} {saved ? 'Сохранено' : 'Сохранить'}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              if (navigator.share) await navigator.share({ title: a.title, url: location.href })
              else {
                await navigator.clipboard.writeText(location.href)
                setCopied(true)
              }
            } catch {
              /* отмена */
            }
          }}
        >
          <Share2 size={16} /> {copied ? 'Ссылка скопирована' : 'Поделиться'}
        </Button>
      </div>
    </article>
  )
}
