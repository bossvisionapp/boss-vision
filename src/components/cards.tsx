import { Brain, Building2, Heart, Lock, MapPin, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { canSeeContacts, useStore } from '../data/store'
import type { Resume, Vacancy } from '../types'
import { EMPLOYMENT_LABEL, EXPERIENCE_LABEL, FORMAT_LABEL, money, salaryRange, timeAgo } from '../lib/format'
import { PART_LABEL, nicheRu, type MatchResult } from '../lib/match'
import { Avatar, Badge, Card, cx } from './ui'

export function CompanyMark({ name, size = 46 }: { name: string; size?: number }) {
  const letter = name.replace(/^(ТОО|ИП|АО)\s*[«"]?/, '')[0] ?? '?'
  return (
    <div className="flex shrink-0 items-center justify-center rounded-2xl bg-hero font-display font-bold text-on-hero lux-grain" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {letter}
    </div>
  )
}

export function MatchBadge({ score }: { score: number }) {
  const tone = score >= 85 ? 'success' : score >= 65 ? 'brand' : 'neutral'
  return <Badge tone={tone}>{score}% match</Badge>
}

export function VacancyCard({ v, score }: { v: Vacancy; score?: number }) {
  const { db, me, toggleFavorite } = useStore()
  const company = db.companies.find((c) => c.id === v.companyId)
  const fav = me?.favorites.includes(v.id)
  return (
    <Card className={cx('relative transition hover:-translate-y-0.5', v.tariff === 'vip' && 'border-gold/50')}>
      <Link to={`/jobs/${v.id}`} className="absolute inset-0 z-0 rounded-3xl" aria-label={v.title} />
      <div className="flex gap-3">
        <CompanyMark name={company?.name ?? '?'} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold leading-snug">{v.title}</h3>
              <p className="truncate text-[13px] text-muted">{company?.name}</p>
            </div>
            {me?.role === 'candidate' && (
              <button type="button" onClick={() => toggleFavorite(v.id)} className="relative z-10 -m-1 rounded-full p-1.5 text-muted hover:text-danger" aria-label="Сохранить">
                <Heart size={20} className={fav ? 'fill-danger text-danger' : ''} />
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {score != null && <MatchBadge score={score} />}
            {v.tariff === 'vip' && <Badge tone="dark">VIP</Badge>}
            {v.tariff === 'premium' && <Badge tone="warn">Premium</Badge>}
            {v.experience === 'none' && <Badge tone="success">Без опыта</Badge>}
          </div>
          <div className="mt-2.5 space-y-1 text-[12.5px] text-muted">
            <p className="flex items-center gap-1.5">
              <MapPin size={13} /> {v.city} · {FORMAT_LABEL[v.format]} · {EMPLOYMENT_LABEL[v.employment]}
            </p>
            <p className="flex items-center gap-1.5 font-semibold text-ink">
              <Wallet size={13} className="text-muted" /> {salaryRange(v.salaryFrom, v.salaryTo)}
            </p>
          </div>
          <p className="mt-2 text-[11px] text-muted/80">{timeAgo(v.createdAt)}</p>
        </div>
      </div>
    </Card>
  )
}

export function MatchBreakdown({ m, compact }: { m: MatchResult; compact?: boolean }) {
  return (
    <div className={cx('grid gap-x-4 gap-y-2', compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3')}>
      {(Object.keys(m.parts) as (keyof MatchResult['parts'])[]).map((k) => (
        <div key={k}>
          <div className="flex justify-between text-[11px]">
            <span className="text-muted">{PART_LABEL[k]}</span>
            <span className="font-bold">{m.parts[k]}%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-gold" style={{ width: `${m.parts[k]}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Карточка кандидата. До покупки доступа к нише контакты скрыты (ТЗ п.36). */
export function CandidateCard({ r, match, action, detailed }: { r: Resume; match?: MatchResult; action?: ReactNode; detailed?: boolean }) {
  const { db, me } = useStore()
  const u = db.users.find((x) => x.id === r.userId)
  const open = canSeeContacts(db, me, r)
  const mbti = u?.testResults.mbti?.summary
  const certs = db.certificates.filter((c) => c.userId === r.userId)
  return (
    <Card>
      <div className="flex gap-3">
        <Avatar name={r.fullName} color={u?.avatarColor ?? '#8a7f71'} photo={r.photo ?? u?.avatar} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/resumes/${r.id}`} className="font-bold hover:text-brand">
                {open ? r.fullName : `${r.fullName.split(' ')[0]} ${r.fullName.split(' ')[1]?.[0] ?? ''}.`}
              </Link>
              <p className="text-[13px] text-muted">{r.position || nicheRu(r.category)}</p>
            </div>
            {match && (
              <div className="rounded-2xl bg-success-soft px-3 py-1.5 text-right text-success">
                <p className="font-display text-xl font-semibold leading-none">{match.score}%</p>
                <p className="text-[9px] font-bold uppercase tracking-wider">match</p>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            {EXPERIENCE_LABEL[r.experience]} · {r.city} · {FORMAT_LABEL[r.format]}
            {r.salary ? ` · ${money(r.salary)}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mbti && (
              <Badge tone="info">
                <Brain size={11} /> MBTI {mbti}
              </Badge>
            )}
            {certs.length > 0 && <Badge tone="warn">🏆 {certs.length} серт.</Badge>}
            {r.skills.slice(0, detailed ? 8 : 4).map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>
          {match && detailed && (
            <div className="mt-3 space-y-3 rounded-2xl bg-surface-2/60 p-3">
              <MatchBreakdown m={match} compact />
              {match.reasons.length > 0 && <p className="text-xs text-success">✓ {match.reasons.join('  ✓ ')}</p>}
              {match.risks.length > 0 && <p className="text-xs text-warn">⚠ {match.risks.join(' · ')}</p>}
            </div>
          )}
          {!open && (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
              <Lock size={11} /> Контакты скрыты — откройте доступ к нише «{nicheRu(r.category)}»
            </p>
          )}
          {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
        </div>
      </div>
    </Card>
  )
}

export function CompanyLine({ companyId }: { companyId: string }) {
  const { db } = useStore()
  const c = db.companies.find((x) => x.id === companyId)
  return (
    <span className="flex items-center gap-1 text-muted">
      <Building2 size={13} /> {c?.name}
    </span>
  )
}
