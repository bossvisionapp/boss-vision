import type { Course, DB, Resume, TestDef, User, Vacancy, WorkFormat } from '../types'
import { CITIES, NICHES, NICHE_RU, money } from './format'
import { matchScore, nicheRu } from './match'

// «AI»-помощники BOSS VISION (MVP): быстрые правила без внешнего API.
// Каждая функция — одно место, куда потом подключается LLM (Claude) с тем же входом/выходом.

const SKILL_DICT: [RegExp, string][] = [
  [/календар/i, 'Google Calendar'],
  [/canva|канв/i, 'Canva'],
  [/crm|црм|битрикс|amo/i, 'CRM'],
  [/notion|ноушн/i, 'Notion'],
  [/trello|трелло/i, 'Trello'],
  [/таблиц|excel|sheets/i, 'Google Sheets'],
  [/chatgpt|gpt|нейросет|\bии\b|\bai\b/i, 'ChatGPT'],
  [/zoom|зум/i, 'Zoom'],
  [/клиент/i, 'Работа с клиентами'],
  [/контент|пост|рилс|reels/i, 'Контент-план'],
  [/сторис|stories/i, 'Сторис'],
  [/инстаграм|instagram/i, 'Instagram'],
  [/тикток|tiktok/i, 'TikTok'],
  [/продаж|закрыва/i, 'Продажи'],
  [/скрипт/i, 'Скрипты продаж'],
  [/возражен/i, 'Работа с возражениями'],
  [/переговор/i, 'Переговоры'],
  [/документ|договор/i, 'Работа с документами'],
  [/встреч/i, 'Организация встреч'],
  [/поездк|билет|командиров/i, 'Организация поездок'],
  [/перепис|почт/i, 'Деловая переписка'],
  [/регламент/i, 'Регламенты'],
  [/таргет|реклам/i, 'Таргет'],
  [/английск|english/i, 'Английский язык'],
  [/задач|контрол/i, 'Управление задачами'],
  [/проект/i, 'Управление проектами'],
]

const NICHE_DICT: [RegExp, string][] = [
  [/smm|смм|инстаграм|сторис/i, 'SMM Assistant'],
  [/продаж|sales|менеджер по прод/i, 'Sales Manager'],
  [/маркет/i, 'Marketing Assistant'],
  [/личн|персонал/i, 'Personal Assistant'],
  [/операцион/i, 'Operations Assistant'],
  [/проект/i, 'Project Assistant'],
  [/контент|копирайт/i, 'Content Assistant'],
  [/ассистент|помощник|секретар/i, 'Business Assistant'],
]

/** Рекомендуемая вилка по нише (Алматы/Астана чуть выше) */
export function salaryHint(niche: string, city: string): [number, number] {
  const base: Record<string, [number, number]> = {
    'Business Assistant': [250000, 400000],
    'Personal Assistant': [250000, 450000],
    'SMM Assistant': [180000, 300000],
    'Marketing Assistant': [200000, 350000],
    'Operations Assistant': [220000, 380000],
    'Project Assistant': [250000, 400000],
    'Sales Manager': [200000, 600000],
    'Content Assistant': [170000, 280000],
  }
  const [a, b] = base[niche] ?? [200000, 350000]
  const k = city === 'Алматы' || city === 'Астана' ? 1 : 0.8
  return [Math.round((a * k) / 10000) * 10000, Math.round((b * k) / 10000) * 10000]
}

export interface VacancyDraft {
  title: string
  category: string
  city: string
  format: WorkFormat
  salaryFrom?: number
  salaryTo?: number
  skills: string[]
  duties: string[]
  requirements: string[]
  questions: string[]
  salaryAdvice: string
}

/** ТЗ п.28 — «Создать вакансию через AI»: обычный текст → структурированная вакансия */
export function vacancyFromText(text: string): VacancyDraft {
  const t = text.trim()
  const city = CITIES.find((c) => t.toLowerCase().includes(c.toLowerCase().slice(0, 5))) ?? 'Алматы'
  const format: WorkFormat = /удал|онлайн|remote/i.test(t) ? 'remote' : /гибрид/i.test(t) ? 'hybrid' : 'office'
  const category = NICHE_DICT.find(([re]) => re.test(t))?.[1] ?? 'Business Assistant'
  const skills = Array.from(new Set(SKILL_DICT.filter(([re]) => re.test(t)).map(([, s]) => s)))

  // зарплата: «до 250 000», «от 200к», «250 тыс»
  const nums = [...t.matchAll(/(от|до)?\s*(\d[\d\s]{2,})\s*(к|тыс|000)?/gi)]
    .map((m) => ({ dir: m[1]?.toLowerCase(), n: normalizeMoney(m[2], m[3]) }))
    .filter((x) => x.n >= 50000 && x.n <= 5000000)
  let salaryFrom: number | undefined
  let salaryTo: number | undefined
  for (const x of nums) {
    if (x.dir === 'от') salaryFrom = x.n
    else if (x.dir === 'до') salaryTo = x.n
    else salaryTo ??= x.n
  }

  // обязанности: фразы после «нужно / надо / будет» или перечисления через запятую
  const tail = t.split(/нужно|надо|будет|задачи[:\s]/i).slice(1).join(' ')
  const duties = (tail || t)
    .split(/[,.;\n]| и /)
    .map((s) => s.trim())
    .filter((s) => s.length > 6 && !/\d{3}/.test(s))
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .slice(0, 6)

  const [hintFrom, hintTo] = salaryHint(category, city)
  const salaryAdvice =
    salaryTo && salaryTo < hintFrom
      ? `Рынок для этой ниши в городе ${city}: ${money(hintFrom)} – ${money(hintTo)}. С вилкой до ${money(salaryTo)} откликов будет меньше — подумайте о бонусах или росте до ${money(hintFrom)}.`
      : `Рынок для этой ниши в городе ${city}: ${money(hintFrom)} – ${money(hintTo)}. Ваша вилка конкурентна.`

  return {
    title: NICHE_RU[category] ?? 'Ассистент',
    category,
    city,
    format,
    salaryFrom,
    salaryTo: salaryTo ?? hintTo,
    skills: skills.length ? skills : ['Тайм-менеджмент', 'Деловая переписка', 'Google Calendar'],
    duties: duties.length ? duties : ['Помощь руководителю в ежедневных задачах', 'Ведение календаря и встреч', 'Коммуникация с клиентами'],
    requirements: requirementsFor(category),
    questions: [
      'Какой график работы: 5/2 или гибкий?',
      'Есть ли испытательный срок и его условия?',
      'Кому подчиняется сотрудник и сколько человек в команде?',
      'Какие бонусы и возможности роста вы предлагаете?',
    ],
    salaryAdvice,
  }
}

function normalizeMoney(raw: string, suffix?: string) {
  let n = Number(raw.replace(/\s/g, ''))
  if (suffix && /к|тыс/i.test(suffix)) n *= 1000
  return n
}

function requirementsFor(niche: string): string[] {
  const common = ['Ответственность и пунктуальность', 'Грамотная устная и письменная речь']
  const map: Record<string, string[]> = {
    'Sales Manager': ['Опыт продаж от 1 года', 'Умение работать с возражениями'],
    'SMM Assistant': ['Насмотренность и вкус', 'Умение снимать и монтировать сторис'],
    'Marketing Assistant': ['Понимание воронки и метрик', 'Уверенная работа с таблицами'],
    'Operations Assistant': ['Системность, любовь к порядку', 'Опыт с CRM / таск-трекерами'],
    'Project Assistant': ['Опыт ведения задач в Trello/Notion', 'Умение держать сроки'],
    'Personal Assistant': ['Конфиденциальность', 'Готовность к гибкому графику'],
    'Content Assistant': ['Грамотные тексты', 'Знание Canva / CapCut'],
  }
  return [...(map[niche] ?? ['Уверенный пользователь Google-сервисов', 'Умение работать в многозадачности']), ...common]
}

/** ТЗ п.13 — сопроводительное письмо по вакансии + резюме */
export function coverLetter(v: Vacancy, r: Resume, company?: string): string {
  const have = new Set([...r.skills, ...r.tools].map((s) => s.toLowerCase()))
  const common = v.skills.filter((s) => have.has(s.toLowerCase()))
  const lastJob = r.work[0]
  return [
    `Здравствуйте${company ? `, команда ${company}` : ''}!`,
    '',
    `Меня зовут ${r.fullName.split(' ')[0]}, откликаюсь на вакансию «${v.title}».`,
    lastJob
      ? `Последнее место работы — ${lastJob.company}, должность «${lastJob.position}». ${lastJob.achievements || lastJob.duties}`.trim()
      : 'Я начинаю карьеру и прошла обучение на платформе BOSS VISION — готова быстро включиться в работу.',
    common.length ? `Уже уверенно работаю с: ${common.join(', ')}.` : `Быстро осваиваю новые инструменты, в том числе ${v.skills.slice(0, 2).join(' и ')}.`,
    r.goal ? `Моя цель: ${r.goal.charAt(0).toLowerCase() + r.goal.slice(1)}` : '',
    '',
    'Буду рада обсудить, чем могу быть полезна вашей команде. Спасибо за внимание!',
  ]
    .filter((x, i, a) => x !== '' || a[i - 1] !== '')
    .join('\n')
}

/** ТЗ п.17 — «улучшить текст / исправить ошибки» */
export function improveText(text: string): string {
  let s = text.replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').replace(/([,.!?;:])(?=[^\s\d])/g, '$1 ').trim()
  s = s.replace(/(^|[.!?]\s+)([a-zа-яё])/g, (_, p, c) => p + c.toUpperCase())
  const fixes: [RegExp, string][] = [
    [/\bответсвенн/gi, 'ответственн'],
    [/\bкомуникаб/gi, 'коммуникаб'],
    [/\bорганизованая/gi, 'организованная'],
    [/\bвобщем\b/gi, 'в общем'],
    [/\bщас\b/gi, 'сейчас'],
    [/\bитд\b/gi, 'и т. д.'],
  ]
  for (const [re, to] of fixes) s = s.replace(re, to)
  if (s && !/[.!?]$/.test(s)) s += '.'
  return s
}

/** Структурировать опыт: превращает сплошной текст в маркированный список */
export function structureText(text: string): string {
  return text
    .split(/[.;\n]|,\s(?=[а-яА-Я])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
    .map((s) => `• ${s[0].toUpperCase()}${s.slice(1)}`)
    .join('\n')
}

/** Адаптировать резюме под вакансию: совпадающие навыки — вперёд, о себе — с акцентом */
export function adaptResume(r: Resume, v: Vacancy): Resume {
  const need = new Set(v.skills.map((s) => s.toLowerCase()))
  const skills = [...r.skills].sort((a, b) => Number(need.has(b.toLowerCase())) - Number(need.has(a.toLowerCase())))
  const hit = skills.filter((s) => need.has(s.toLowerCase()))
  const about = hit.length && !r.about.includes('Для позиции')
    ? `${r.about.trim()} Для позиции «${v.title}» особенно полезны мои навыки: ${hit.slice(0, 3).join(', ')}.`.trim()
    : r.about
  return { ...r, skills, about }
}

/** Заполненность профиля (ТЗ п.45 «Ваш профиль заполнен на 80%») */
export function profileCompleteness(u: User, r?: Resume): { pct: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [!!(u.avatar || r?.photo), 'фото'],
    [!!r?.position, 'профессия'],
    [!!r?.about && r.about.length > 30, 'о себе'],
    [(r?.skills.length ?? 0) >= 3, 'навыки'],
    [(r?.work.length ?? 0) > 0 || r?.experience === 'none', 'опыт работы'],
    [(r?.education.length ?? 0) > 0, 'образование'],
    [(r?.languages.length ?? 0) > 0, 'языки'],
    [!!r?.salary, 'зарплата'],
    [!!u.testResults.mbti, 'тест MBTI'],
    [Object.keys(u.testResults).length >= 2, 'ещё один AI-тест'],
  ]
  const done = checks.filter(([ok]) => ok).length
  return { pct: Math.round((done / checks.length) * 100), missing: checks.filter(([ok]) => !ok).map(([, l]) => l) }
}

export interface CareerProfile {
  strengths: string[]
  growth: string[]
  professions: string[]
  vacancies: { v: Vacancy; score: number }[]
  courses: Course[]
  plan: { period: string; steps: string[] }[]
  careerMatch: number
}

/** ТЗ п.7 — AI Career Profile */
export function careerProfile(db: DB, u: User, r?: Resume): CareerProfile {
  const scales = Object.values(u.testResults).flatMap((res) => {
    const t = db.tests.find((x) => x.id === res.testId)
    return t ? t.scales.filter((s) => res.top.includes(s.id)) : []
  })
  const mbti = u.testResults.mbti
  const strengths = uniq([...scales.flatMap((s) => s.strengths), ...(r?.skills.slice(0, 2) ?? [])]).slice(0, 6)
  const growth = uniq(scales.flatMap((s) => s.weaknesses)).slice(0, 4)
  const professions = uniq([r?.category ?? '', ...scales.flatMap((s) => s.roles)].filter(Boolean))
    .slice(0, 4)
    .map(nicheRu)

  const vacancies = r
    ? db.vacancies
        .filter((v) => v.status === 'active')
        .map((v) => ({ v, score: matchScore(v, r, u, db.settings.weights).score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
    : []
  const careerMatch = vacancies.length ? Math.round(vacancies.reduce((s, x) => s + x.score, 0) / vacancies.length) : 0

  const toLearn = uniq(scales.flatMap((s) => s.skills))
  const courses = db.courses.filter((c) => c.published && !c.comingSoon && (c.audience !== 'employer') && (r?.category === 'Sales Manager' ? c.id === 'c_sales' : c.id === 'c_miniboss' || c.id === 'c_sales')).slice(0, 2)

  const niche = nicheRu(r?.category ?? 'Business Assistant')
  const plan = [
    { period: '0–3 месяца', steps: [`Пройти Mini Boss Academy и получить сертификат`, `Закрыть пробелы: ${toLearn.slice(0, 2).join(', ') || 'CRM, Notion'}`, `Откликнуться на 10+ вакансий «${niche}»`] },
    { period: '3–12 месяцев', steps: ['Выйти на первую работу и пройти испытательный срок', 'Собрать портфолио из 3 кейсов с цифрами', 'Освоить автоматизацию и AI-инструменты'] },
    { period: '1–3 года', steps: [mbti && /^E.T/.test(mbti.summary) ? 'Вырасти до операционного менеджера / руководителя проектов' : 'Стать старшим ассистентом руководителя', 'Обучать новых ассистентов команды', 'Доход ×2 от стартового'] },
  ]

  return { strengths, growth, professions, vacancies, courses, plan, careerMatch }
}

/** ТЗ п.42 — AI для новостей: краткое содержание + категория */
export function newsAssist(text: string): { excerpt: string; category: string; readMinutes: number; title: string } {
  const clean = text.replace(/\s+/g, ' ').trim()
  const sentences = clean.split(/(?<=[.!?])\s+/)
  const cats: [RegExp, string][] = [
    [/\bai\b|\bии\b|нейросет|chatgpt|искусствен/i, 'AI'],
    [/маркет|реклам|бренд|smm/i, 'Маркетинг'],
    [/продаж|выручк|клиент/i, 'Продажи'],
    [/hr|найм|сотрудник|ваканс|кадр/i, 'HR'],
    [/стартап|инвест|венчур/i, 'Стартапы'],
    [/курс|онлайн-школ|инфобиз/i, 'Инфобизнес'],
    [/карьер|резюме|собеседован/i, 'Карьера'],
  ]
  return {
    title: (sentences[0] ?? '').slice(0, 90),
    excerpt: sentences.slice(0, 2).join(' ').slice(0, 220),
    category: cats.find(([re]) => re.test(clean))?.[1] ?? 'Бизнес',
    readMinutes: Math.max(1, Math.round(clean.split(' ').length / 180)),
  }
}

/** Рекомендация следующего теста */
export function nextTest(tests: TestDef[], u: User): TestDef | undefined {
  return tests.find((t) => t.enabled && !u.testResults[t.id])
}

export function nicheFromProfession(p: string) {
  return NICHE_DICT.find(([re]) => re.test(p))?.[1] ?? NICHES[0]
}

const uniq = <T,>(a: T[]) => Array.from(new Set(a))
