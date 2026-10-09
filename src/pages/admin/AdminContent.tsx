import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, Chip, Field, Input, Modal, Select, Textarea, Toggle } from '../../components/ui'
import { useStore } from '../../data/store'
import { newsAssist } from '../../lib/ai'
import { dateLong, nowIso, uid } from '../../lib/format'
import type { Article, ArticleKind } from '../../types'
import { ADVICE_CATS, NEWS_CATS } from '../common/Articles'

const COVERS = ['linear-gradient(135deg,#2a241f,#b08d57)', 'linear-gradient(135deg,#3a2f27,#a97d5a)', 'linear-gradient(135deg,#1f2622,#5f7c6a)', 'linear-gradient(135deg,#1f2733,#4b6178)', 'linear-gradient(135deg,#2c2433,#6e5a7c)', 'linear-gradient(135deg,#2b2320,#7a4f3a)']

/** ТЗ п.41–44 — новости и база знаний. AI готовит черновик, публикация — только через модерацию */
export function AdminArticles({ kind }: { kind: ArticleKind }) {
  const { db, update } = useStore()
  const [edit, setEdit] = useState<Article | null>(null)
  const [ai, setAi] = useState(false)
  const [src, setSrc] = useState('')
  const [srcName, setSrcName] = useState('')
  const [f, setF] = useState<'all' | 'draft'>('all')
  const list = db.articles.filter((a) => a.kind === kind && (f === 'all' || a.status === 'draft'))
  const cats = kind === 'news' ? NEWS_CATS : Array.from(new Set([...ADVICE_CATS.employer, ...ADVICE_CATS.candidate]))
  const blank = (): Article => ({ id: uid('ar'), kind, audience: kind === 'news' ? 'all' : 'candidate', title: '', category: cats[0], excerpt: '', body: '', source: 'BOSS VISION Media', readMinutes: 3, cover: COVERS[Math.floor(Math.random() * COVERS.length)], status: 'draft', createdAt: nowIso() })
  const save = (a: Article) => update((d) => ({ ...d, articles: d.articles.some((x) => x.id === a.id) ? d.articles.map((x) => (x.id === a.id ? a : x)) : [a, ...d.articles] }))

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => setEdit(blank())}><Plus size={16} /> Добавить</Button>
        {kind === 'news' && <Button variant="gold" onClick={() => setAi(true)}><Sparkles size={16} /> AI-новость из текста</Button>}
        <div className="flex-1" />
        <Chip active={f === 'all'} onClick={() => setF('all')}>Все</Chip>
        <Chip active={f === 'draft'} onClick={() => setF('draft')}>На модерации · {db.articles.filter((a) => a.kind === kind && a.status === 'draft').length}</Chip>
      </div>
      <div className="space-y-2">
        {list.map((a) => (
          <Card key={a.id} className="flex items-center gap-3 p-3">
            <div className="h-12 w-12 shrink-0 rounded-2xl" style={{ background: a.cover }} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{a.title}</p>
              <p className="text-xs text-muted">{a.category} · {kind === 'advice' && `${a.audience === 'employer' ? 'предпринимателю' : 'кандидату'} · `}{dateLong(a.createdAt)}</p>
            </div>
            {a.aiDraft && <Badge tone="info">AI</Badge>}
            {a.status === 'draft' ? (
              <Button size="sm" onClick={() => save({ ...a, status: 'published' })}>Опубликовать</Button>
            ) : (
              <Badge tone="success">Опубликовано</Badge>
            )}
            <Button size="sm" variant="ghost" onClick={() => setEdit(a)}>Изменить</Button>
            <button type="button" onClick={() => confirm('Удалить?') && update((d) => ({ ...d, articles: d.articles.filter((x) => x.id !== a.id) }))} className="p-1 text-muted hover:text-danger" aria-label="Удалить"><Trash2 size={16} /></button>
          </Card>
        ))}
      </div>

      <Modal open={ai} onClose={() => setAi(false)} title="AI для новостей">
        <div className="space-y-3">
          <p className="text-sm text-muted">Вставьте текст статьи — AI сделает заголовок, краткое содержание, определит категорию и время чтения. Публикация — только после модерации.</p>
          <Textarea value={src} onChange={(e) => setSrc(e.target.value)} className="min-h-48" placeholder="Текст новости или пресс-релиза…" />
          <Field label="Источник"><Input value={srcName} onChange={(e) => setSrcName(e.target.value)} placeholder="Forbes Kazakhstan, Kapital.kz…" /></Field>
          <Button
            className="w-full"
            disabled={src.trim().length < 40}
            onClick={() => {
              const r = newsAssist(src)
              setEdit({ ...blank(), title: r.title, excerpt: r.excerpt, category: r.category, readMinutes: r.readMinutes, body: src.trim(), source: srcName || 'Источник не указан', aiDraft: true })
              setAi(false)
              setSrc('')
            }}
          >
            <Sparkles size={16} /> Подготовить черновик
          </Button>
        </div>
      </Modal>

      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.aiDraft ? 'Черновик от AI — проверьте' : 'Материал'} wide>
          <div className="space-y-3">
            <Field label="Заголовок"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Категория"><Select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} options={cats.map((c) => ({ value: c, label: c }))} /></Field>
              {kind === 'advice' && <Field label="Для кого"><Select value={edit.audience} onChange={(e) => setEdit({ ...edit, audience: e.target.value as Article['audience'] })} options={[{ value: 'candidate', label: 'Кандидату' }, { value: 'employer', label: 'Предпринимателю' }, { value: 'all', label: 'Всем' }]} /></Field>}
              <Field label="Минут чтения"><Input type="number" value={edit.readMinutes} onChange={(e) => setEdit({ ...edit, readMinutes: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Краткое описание"><Input value={edit.excerpt} onChange={(e) => setEdit({ ...edit, excerpt: e.target.value })} /></Field>
            <Field label="Полный текст"><Textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} className="min-h-48" /></Field>
            <Field label="Источник"><Input value={edit.source} onChange={(e) => setEdit({ ...edit, source: e.target.value })} /></Field>
            <div className="flex flex-wrap gap-2">{COVERS.map((c) => <button key={c} type="button" onClick={() => setEdit({ ...edit, cover: c })} className={`h-9 w-14 rounded-xl border-2 ${edit.cover === c ? 'border-gold' : 'border-transparent'}`} style={{ background: c }} />)}</div>
            <Toggle label="Опубликовано" checked={edit.status === 'published'} onChange={(v) => setEdit({ ...edit, status: v ? 'published' : 'draft' })} />
            <Button className="w-full" disabled={!edit.title} onClick={() => { save(edit); setEdit(null) }}>Сохранить</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
