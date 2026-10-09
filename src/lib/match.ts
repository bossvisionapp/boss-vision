import type { DB, Experience, MatchWeights, Resume, User, Vacancy } from '../types'
import { NICHE_RU, money } from './format'

// AI Matching (ТЗ п.16, 32, 33). Прозрачная формула: 6 компонентов, веса настраиваются в админке
// (Настройки → Веса AI-подбора). Позже сюда подключается LLM — интерфейс MatchResult не меняется.

const EXP_RANK: Record<Experience, number> = { none: 0, '1-3': 1, '3-6': 2, '6+': 3 }
const norm = (s: string) => s.trim().toLowerCase()

export interface MatchParts {
  skills: number
  experience: number
  salary: number
  location: number
  format: number
  personality: number
}

export interface MatchResult {
  score: number
  parts: MatchParts
  reasons: string[] // почему подходит
  risks: string[] // риски для работодателя
  improve: string[] // что улучшить кандидату
  missingSkills: string[]
}

export const PART_LABEL: Record<keyof MatchParts, string> = {
  skills: 'Skills',
  experience: 'Experience',
  salary: 'Salary',
  location: 'Location',
  format: 'Format',
  personality: 'Personality',
}

export function matchScore(v: Vacancy, r: Resume, u: User | undefined, w: MatchWeights): MatchResult {
  const reasons: string[] = []
  const risks: string[] = []
  const improve: string[] = []

  // Skills: навыки + инструменты кандидата против навыков вакансии
  const have = new Set([...r.skills, ...r.tools].map(norm))
  const need = v.skills.map(norm)
  const common = v.skills.filter((s) => have.has(norm(s)))
  const missingSkills = v.skills.filter((s) => !have.has(norm(s)))
  const skills = need.length ? Math.round((common.length / need.length) * 100) : 70
  if (common.length) reasons.push(common.slice(0, 3).join(', '))
  if (missingSkills.length) {
    risks.push(`мало опыта в ${missingSkills.slice(0, 2).join(', ')}`)
    improve.push(`подтянуть навыки: ${missingSkills.slice(0, 3).join(', ')}`)
  }

  // Experience
  const d = EXP_RANK[r.experience] - EXP_RANK[v.experience]
  const experience = d >= 0 ? 100 : d === -1 ? 60 : 25
  if (d >= 0) reasons.push(r.experience === 'none' ? 'готов(а) учиться' : `опыт ${expText(r.experience)}`)
  else {
    risks.push('опыта меньше, чем нужно')
    improve.push('получить практику — курс Academy с кейсами')
  }

  // Salary
  let salary = 100
  if (r.salary && v.salaryTo && r.salary > v.salaryTo) {
    const over = (r.salary - v.salaryTo) / v.salaryTo
    salary = Math.max(20, Math.round(100 - over * 200))
    risks.push(`ожидания ${money(r.salary)} выше вилки`)
  } else reasons.push('зарплата подходит')

  // Location
  let location = 100
  if (v.format !== 'remote' && r.format !== 'remote' && v.city !== r.city) {
    location = 30
    risks.push(`живёт в другом городе (${r.city})`)
  } else if (v.format === 'remote' || r.format === 'remote') reasons.push('онлайн-формат')
  else reasons.push(r.city)

  // Format
  const format = v.format === r.format ? 100 : v.format === 'hybrid' || r.format === 'hybrid' ? 70 : 35

  // Personality: результаты тестов + совпадение ниши
  let personality = 55
  const results = u ? Object.values(u.testResults) : []
  if (results.length) {
    personality = 70
    if (u && personalityFits(u, v.category)) {
      personality = 95
      reasons.push(`тип личности подходит${u.testResults.mbti ? ` (MBTI ${u.testResults.mbti.summary})` : ''}`)
    }
  } else improve.push('пройти AI-тесты — работодатели видят их результаты')
  if (norm(r.category) === norm(v.category)) personality = Math.min(100, personality + 5)

  const parts: MatchParts = { skills, experience, salary, location, format, personality }
  const total = Object.values(w).reduce((a, b) => a + b, 0) || 1
  const score = Math.round((Object.keys(parts) as (keyof MatchParts)[]).reduce((s, k) => s + parts[k] * w[k], 0) / total)

  return { score: Math.min(99, score), parts, reasons, risks, improve, missingSkills }
}

/** Подходит ли ниша по результатам тестов (роли ведущих шкал). */
function personalityFits(u: User, niche: string) {
  return Object.values(u.testResults).some((t) => t.top.some((id) => (TEST_ROLE_INDEX[t.testId]?.[id] ?? []).includes(niche)))
}

// заполняется из db.tests при старте (см. store) — роли ведущих шкал каждого теста
export const TEST_ROLE_INDEX: Record<string, Record<string, string[]>> = {}
export function indexTests(db: DB) {
  for (const t of db.tests) {
    TEST_ROLE_INDEX[t.id] = Object.fromEntries(t.scales.map((s) => [s.id, s.roles]))
  }
}

function expText(e: Experience) {
  return { none: 'без опыта', '1-3': '1–3 года', '3-6': '3–6 лет', '6+': '6+ лет' }[e]
}

/** Вопросы на собеседование (ТЗ п.32) по нише и рискам */
export function interviewQuestions(v: Vacancy, m: MatchResult): string[] {
  const base: Record<string, string[]> = {
    'Business Assistant': ['Как ведёте календарь руководителя?', 'Как расставляете приоритеты, если задач больше, чем времени?'],
    'Personal Assistant': ['Как организуете поездку руководителя от А до Я?', 'Как сохраняете конфиденциальность?'],
    'SMM Assistant': ['Покажите контент-план, который вы делали', 'Как измеряете результат контента?'],
    'Marketing Assistant': ['Какие метрики рекламы вы отслеживали?', 'Как готовите отчёт по маркетингу?'],
    'Operations Assistant': ['Какой регламент вы написали сами?', 'Как контролируете дедлайны команды?'],
    'Project Assistant': ['Как ведёте задачи проекта в Trello/Notion?', 'Что делаете, если проект срывает сроки?'],
    'Sales Manager': ['Как работаете с возражением «дорого»?', 'Какая у вас была конверсия и как вы её считали?'],
    'Content Assistant': ['Как пишете текст под разные площадки?', 'Сколько единиц контента делаете в неделю?'],
  }
  const q = [...(base[v.category] ?? ['Расскажите о своём самом сильном результате'])]
  q.push('Как работаете с конфликтным клиентом?')
  if (m.missingSkills.length) q.push(`Какой у вас опыт с ${m.missingSkills[0]}?`)
  if (m.parts.salary < 100) q.push('Какой минимальный уровень дохода для вас комфортен на старте?')
  return q.slice(0, 4)
}

export const nicheRu = (n: string) => NICHE_RU[n] ?? n
