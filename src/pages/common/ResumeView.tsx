import { Award, Brain, Download, ExternalLink, Lock, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MatchBreakdown } from '../../components/cards'
import { Avatar, Badge, Button, Card, Empty, Field, Modal, Select, Textarea } from '../../components/ui'
import { canSeeContacts, useMe, useStore } from '../../data/store'
import { EMPLOYMENT_LABEL, EXPERIENCE_LABEL, FORMAT_LABEL, dateLong, money, plural } from '../../lib/format'
import { interviewQuestions, matchScore, nicheRu } from '../../lib/match'

/** Резюме как цифровое карьерное портфолио (ТЗ п.6) + печать в PDF */
export default function ResumeView() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { db, inviteCandidate } = useStore()
  const me = useMe()
  const nav = useNavigate()
  const r = db.resumes.find((x) => x.id === id)
  const myVacs = db.vacancies.filter((v) => v.ownerId === me.id && v.status === 'active')
  const [open, setOpen] = useState(false)
  const [vacId, setVacId] = useState(myVacs[0]?.id ?? '')
  const [text, setText] = useState('')

  useEffect(() => {
    if (params.get('print') === '1') setTimeout(() => window.print(), 400)
  }, [params])

  if (!r) return <Empty icon={<Brain />} title="Резюме не найдено" />
  const u = db.users.find((x) => x.id === r.userId)
  const own = r.userId === me.id
  const open_ = canSeeContacts(db, me, r)
  const certs = db.certificates.filter((c) => c.userId === r.userId)
  const tests = u ? Object.values(u.testResults) : []
  const vac = db.vacancies.find((v) => v.id === vacId)
  const m = vac && me.role === 'employer' ? matchScore(vac, r, u, db.settings.weights) : null

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <button type="button" onClick={() => nav(-1)} className="text-sm font-semibold text-muted hover:text-ink">
          ← Резюме
        </button>
        <div className="flex gap-2">
          {(own || open_) && (
            <Button size="sm" variant="secondary" onClick={() => window.print()}>
              <Download size={15} /> Скачать PDF
            </Button>
          )}
          {own && (
            <Button size="sm" onClick={() => nav('/resume')}>
              Редактировать
            </Button>
          )}
        </div>
      </div>

      <Card className="print-area overflow-hidden p-0">
        <div className="bg-hero p-6 text-on-hero lux-grain sm:p-8">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar name={r.fullName} color={u?.avatarColor ?? '#8a7f71'} photo={r.photo ?? u?.avatar} size={92} ring />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl font-semibold">{open_ ? r.fullName : `${r.fullName.split(' ')[0]} ${r.fullName.split(' ')[1]?.[0] ?? ''}.`}</h1>
              <p className="mt-1 text-lg opacity-90">{r.position || nicheRu(r.category)}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm opacity-75">
                <MapPin size={14} /> {r.city}
                {r.age ? ` · ${r.age} ${plural(r.age, 'год', 'года', 'лет')}` : ''} · {FORMAT_LABEL[r.format]} · {EMPLOYMENT_LABEL[r.employment]}
              </p>
            </div>
            {r.salary && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest opacity-70">Ожидания</p>
                <p className="font-display text-2xl font-semibold">{money(r.salary)}</p>
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {open_ ? (
              <>
                {r.phone && <span className="flex items-center gap-1.5"><Phone size={14} /> {r.phone}</span>}
                {r.email && <span className="flex items-center gap-1.5"><Mail size={14} /> {r.email}</span>}
                {r.telegram && <span className="flex items-center gap-1.5"><Send size={14} /> {r.telegram}</span>}
                {r.whatsapp && <span className="flex items-center gap-1.5"><MessageCircle size={14} /> WhatsApp {r.whatsapp}</span>}
              </>
            ) : (
              <span className="flex items-center gap-1.5 opacity-80">
                <Lock size={14} /> Контакты, портфолио, сертификаты и тесты откроются после покупки доступа к нише
              </span>
            )}
          </div>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          {r.goal && <Block title="Цель"><p>{r.goal}</p></Block>}
          {r.about && <Block title="О себе"><p className="whitespace-pre-line leading-relaxed">{r.about}</p></Block>}
          <Block title="Навыки">
            <div className="flex flex-wrap gap-1.5">{r.skills.map((s) => <Badge key={s} tone="brand">{s}</Badge>)}</div>
          </Block>
          {r.tools.length > 0 && (
            <Block title="Инструменты">
              <div className="flex flex-wrap gap-1.5">{r.tools.map((s) => <Badge key={s}>{s}</Badge>)}</div>
            </Block>
          )}
          <Block title={`Опыт работы · ${EXPERIENCE_LABEL[r.experience]}`}>
            {r.work.length === 0 && <p className="text-muted">Начинающий специалист — готов(а) учиться</p>}
            <div className="space-y-4">
              {r.work.map((w, i) => (
                <div key={i} className="border-l-2 border-gold pl-4">
                  <p className="font-semibold">{w.position}</p>
                  <p className="text-sm text-muted">{w.company} · {w.period}</p>
                  {w.duties && <p className="mt-1 whitespace-pre-line text-sm">{w.duties}</p>}
                  {w.achievements && <p className="mt-1 text-sm font-semibold text-success">★ {w.achievements}</p>}
                </div>
              ))}
            </div>
          </Block>
          {r.education.length > 0 && (
            <Block title="Образование">
              {r.education.map((e, i) => <p key={i}><b>{e.place}</b> · {e.specialty} · {e.year}</p>)}
            </Block>
          )}
          <Block title="Языки">
            <p>{r.languages.map((l) => `${l.name} — ${l.level.toLowerCase()}`).join(' · ')}</p>
          </Block>
          {open_ && r.portfolio.length > 0 && (
            <Block title="Портфолио">
              <div className="flex flex-wrap gap-2">
                {r.portfolio.map((p) => (
                  <a key={p.url + p.label} href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-sm">
                    {p.label} <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            </Block>
          )}
          {open_ && (certs.length > 0 || tests.length > 0) && (
            <div className="rounded-3xl bg-surface-2 p-5">
              <p className="mb-3 font-display text-lg font-semibold">Проверено BOSS VISION</p>
              <div className="space-y-2 text-sm">
                {certs.map((c) => (
                  <p key={c.id} className="flex items-center gap-2"><Award size={16} className="text-gold" /> {c.title} <span className="text-muted">· №{c.number}</span></p>
                ))}
                {tests.map((t) => (
                  <p key={t.testId} className="flex items-center gap-2"><Brain size={16} className="text-gold" /> {t.title}: <b>{t.summary}</b></p>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-muted">Обновлено {dateLong(r.updatedAt)} · BOSS VISION</p>
        </div>
      </Card>

      {me.role === 'employer' && (
        <div className="no-print mt-4 space-y-3">
          {myVacs.length > 0 && (
            <Card>
              <Field label="Сравнить с вакансией">
                <Select value={vacId} onChange={(e) => setVacId(e.target.value)} options={myVacs.map((v) => ({ value: v.id, label: v.title }))} />
              </Field>
              {m && (
                <div className="mt-4">
                  <p className="mb-2 font-display text-2xl font-semibold text-success">{m.score}% Overall Match</p>
                  <MatchBreakdown m={m} />
                  {m.risks.length > 0 && <p className="mt-3 text-sm text-warn">⚠ Риски: {m.risks.join(' · ')}</p>}
                  <p className="mt-3 text-sm font-semibold">На собеседовании спросить:</p>
                  <ul className="mt-1 space-y-0.5 text-sm text-muted">{interviewQuestions(vac!, m).map((q) => <li key={q}>• {q}</li>)}</ul>
                </div>
              )}
            </Card>
          )}
          <div className="flex flex-wrap gap-2">
            {!open_ && (
              <Button variant="gold" onClick={() => nav(`/employer/base?niche=${encodeURIComponent(r.category)}`)}>
                <Lock size={15} /> Открыть контакты
              </Button>
            )}
            <Button onClick={() => setOpen(true)} disabled={!myVacs.length}>Пригласить на вакансию</Button>
            {!myVacs.length && <Link to="/employer/vacancies/new" className="self-center text-sm text-brand underline">Сначала создайте вакансию</Link>}
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Пригласить кандидата">
        <div className="space-y-3">
          <Field label="Вакансия">
            <Select value={vacId} onChange={(e) => setVacId(e.target.value)} options={myVacs.map((v) => ({ value: v.id, label: v.title }))} />
          </Field>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`${r.fullName.split(' ')[0]}, здравствуйте! Приглашаем на собеседование…`} />
          <Button className="w-full" size="lg" onClick={() => nav(`/chats/${inviteCandidate(vacId, r.id, text || `Здравствуйте! Приглашаем вас на вакансию «${vac?.title}». Когда удобно созвониться?`)}`)}>
            Отправить приглашение
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{title}</p>
      {children}
    </section>
  )
}
