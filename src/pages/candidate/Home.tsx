import { ArrowRight, Brain, Briefcase, ChevronRight, GraduationCap, Lightbulb, Newspaper, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { VacancyCard } from '../../components/cards'
import { Avatar, Button, Card, Progress, Ring, Search, SectionTitle } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { careerProfile, nextTest, profileCompleteness } from '../../lib/ai'
import { lessonIds } from '../../data/courses'
import { timeAgo } from '../../lib/format'

/** ТЗ п.45 — главная кандидата */
export default function CandidateHome() {
  const { db } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const resume = db.resumes.find((r) => r.userId === me.id)
  const profile = profileCompleteness(me, resume)
  const career = useMemo(() => careerProfile(db, me, resume), [db, me, resume])
  const test = nextTest(db.tests, me)

  const learning = db.courses
    .filter((c) => (me.courseProgress[c.id]?.length ?? 0) > 0 && !c.comingSoon)
    .map((c) => ({ c, pct: Math.round(((me.courseProgress[c.id]?.length ?? 0) / Math.max(1, lessonIds(c).length)) * 100) }))
    .filter((x) => x.pct < 100)[0]

  const top = useMemo(() => career.vacancies, [career])
  const news = db.articles.filter((a) => a.kind === 'news' && a.status === 'published').slice(0, 5)
  const advice = db.articles.filter((a) => a.kind === 'advice' && a.status === 'published' && a.audience !== 'employer').slice(0, 3)

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-3 fade-up">
        <Avatar name={me.name} color={me.avatarColor} photo={me.avatar ?? resume?.photo} size={52} ring />
        <div>
          <h1 className="font-display text-[26px] font-semibold leading-tight">Привет, {me.name.split(' ')[0]}! 👋</h1>
          <p className="text-sm text-muted">Продолжай развиваться вместе с BOSS VISION</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          nav(`/jobs?q=${encodeURIComponent(q)}`)
        }}
      >
        <Search value={q} onChange={setQ} placeholder="Поиск вакансий, навыков, курсов…" />
      </form>

      {profile.pct < 100 && (
        <Card className="flex items-center gap-4 border-gold/40">
          <Ring value={profile.pct} size={58} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Ваш профиль заполнен на {profile.pct}%</p>
            <p className="truncate text-xs text-muted">Добавьте: {profile.missing.slice(0, 3).join(', ')}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => nav(profile.missing.includes('тест MBTI') ? '/tests/mbti' : '/resume')}>
            Дополнить →
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Tile icon={<Briefcase size={20} />} title="Вакансии для вас" value={top[0] ? `${top[0].score}% match` : '—'} to="/jobs?sort=match" />
        <Tile icon={<GraduationCap size={20} />} title="Продолжить обучение" value={learning ? `${learning.c.title.replace(' Academy', '')} · ${learning.pct}%` : 'Academy'} to={learning ? `/academy/${learning.c.id}` : '/academy'} />
        <Tile icon={<Brain size={20} />} title="Мои тесты" value={`${Object.keys(me.testResults).length} из ${db.tests.filter((t) => t.enabled).length}`} to="/tests" />
      </div>

      <div className="relative overflow-hidden rounded-[30px] bg-hero p-6 text-on-hero lux-grain">
        <div className="flex items-center gap-5">
          <Ring value={career.careerMatch} size={84} stroke={7} label="match" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">Ваш карьерный Match</p>
            <p className="mt-1 font-display text-xl font-semibold">{career.professions[0] ?? 'Пройдите тесты'}</p>
            <p className="mt-1 text-sm opacity-75">AI анализирует резюме, навыки, тесты и обучение</p>
          </div>
        </div>
        <Button variant="gold" className="mt-5" onClick={() => nav('/profile#ai')}>
          <Sparkles size={16} /> AI Career Profile
        </Button>
      </div>

      <section>
        <SectionTitle title="TOP вакансии для вас" action={<Link to="/jobs?sort=match" className="text-sm font-semibold text-brand">Смотреть все</Link>} />
        <div className="grid gap-3 md:grid-cols-2">
          {top.map(({ v, score }) => (
            <VacancyCard key={v.id} v={v} score={score} />
          ))}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {learning && (
          <Card onClick={() => nav(`/academy/${learning.c.id}`)}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Продолжить обучение</p>
            <p className="mt-1 font-display text-lg font-semibold">{learning.c.title}</p>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={learning.pct} gold />
              <span className="text-sm font-bold">{learning.pct}%</span>
            </div>
          </Card>
        )}
        {test && (
          <Card onClick={() => nav(`/tests/${test.id}`)} className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Brain size={22} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Рекомендуем пройти</p>
              <p className="font-semibold">{test.title} Test</p>
              <p className="text-xs text-muted">~{test.minutes} мин · результат в профиле</p>
            </div>
            <ChevronRight className="text-muted" />
          </Card>
        )}
      </div>

      <section>
        <SectionTitle title="Новости" action={<Link to="/news" className="text-sm font-semibold text-brand">Все</Link>} />
        <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {news.map((a) => (
            <Link key={a.id} to={`/articles/${a.id}`} className="w-60 shrink-0">
              <div className="flex h-32 items-end rounded-3xl p-3 text-white" style={{ background: a.cover }}>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold backdrop-blur">{a.category}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{a.title}</p>
              <p className="text-xs text-muted">{timeAgo(a.createdAt)}</p>
            </Link>
          ))}
          <Link to="/news" className="flex w-32 shrink-0 flex-col items-center justify-center rounded-3xl border border-dashed border-line text-sm text-muted">
            <Newspaper size={20} />
            Все новости
          </Link>
        </div>
      </section>

      <section>
        <SectionTitle title="Советы" action={<Link to="/advice" className="text-sm font-semibold text-brand">Все</Link>} />
        <div className="space-y-2">
          {advice.map((a) => (
            <Link key={a.id} to={`/articles/${a.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
              <Lightbulb size={18} className="text-gold" />
              <span className="flex-1 text-sm font-semibold">{a.title}</span>
              <ArrowRight size={16} className="text-muted" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function Tile({ icon, title, value, to }: { icon: React.ReactNode; title: string; value: string; to: string }) {
  return (
    <Link to={to} className="rounded-3xl border border-line bg-surface p-3.5 transition hover:-translate-y-0.5 hover:border-gold/60">
      <span className="text-brand">{icon}</span>
      <p className="mt-2 text-[12.5px] font-semibold leading-tight">{title}</p>
      <p className="mt-1 text-[11.5px] font-semibold text-success">{value}</p>
    </Link>
  )
}
