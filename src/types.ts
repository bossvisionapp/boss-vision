// BOSS VISION — единые типы данных.
// Сейчас всё хранится в localStorage (демо). Эти же типы потом станут таблицами базы (Supabase).

/** candidate — ищет работу; employer — предприниматель; admin — команда BOSS VISION;
 *  curator — куратор Academy (как в Learning Platform: видит учеников, задания и входящие). */
export type Role = 'candidate' | 'employer' | 'admin' | 'curator'

export type WorkFormat = 'office' | 'remote' | 'hybrid'
export type Employment = 'full' | 'part' | 'project'
export type Experience = 'none' | '1-3' | '3-6' | '6+'
export type Schedule = '5/2' | '2/2' | 'flex' | 'shift'
export type ThemeName = 'classic' | 'gold' | 'noir' | 'royal'
export type ThemeMode = 'light' | 'dark' | 'auto'

export interface Activity {
  at: string
  text: string
}

export interface User {
  id: string
  email: string
  password: string // только для демо — в проде хэш на сервере
  name: string
  phone: string
  city: string
  age?: number
  role: Role
  avatar?: string // dataURL
  avatarColor: string
  companyId?: string
  blocked?: boolean
  phoneVerified?: boolean
  emailVerified?: boolean
  consentAt?: string
  createdAt: string
  lastActiveAt: string
  favorites: string[] // сохранённые вакансии
  savedNews: string[]
  testResults: Record<string, TestResult>
  courseProgress: Record<string, string[]> // courseId → пройденные lessonId
  baseAccess: { niche: string; until: string }[] // доступ к базе резюме по нишам
  interests: string[]
  settings: { theme: ThemeName; mode: ThemeMode; push: boolean; email: boolean; whatsapp: boolean }
  activity: Activity[]
  onboarded: boolean
}

export interface Company {
  id: string
  ownerId: string
  name: string
  employees: string
  industry: string
  city: string
  turnover: string
  about: string
}

export type VacancyStatus = 'draft' | 'moderation' | 'active' | 'rejected' | 'closed' | 'blocked'
export type VacancyTariff = 'standard' | 'premium' | 'vip'

export interface Vacancy {
  id: string
  companyId: string
  ownerId: string
  title: string
  category: string // ниша
  salaryFrom?: number
  salaryTo?: number
  city: string
  format: WorkFormat
  employment: Employment
  experience: Experience
  schedule: Schedule
  languages: string[]
  skills: string[]
  description: string
  duties: string[]
  requirements: string[]
  extra: string
  contactName: string
  contactPhone: string
  whatsapp: string
  contactEmail: string
  startDate?: string
  status: VacancyStatus
  tariff: VacancyTariff
  rejectReason?: string
  views: number
  saves: number
  createdAt: string
  expiresAt?: string
}

export interface WorkPlace {
  company: string
  position: string
  period: string
  duties: string
  achievements: string
}

export interface Education {
  place: string
  specialty: string
  year: string
}

export interface Resume {
  id: string
  userId: string
  fullName: string
  photo?: string
  position: string
  category: string
  city: string
  age?: number
  phone: string
  email: string
  telegram: string
  whatsapp: string
  goal: string
  about: string
  salary?: number
  format: WorkFormat
  employment: Employment
  experience: Experience
  skills: string[]
  tools: string[]
  languages: { name: string; level: string }[]
  work: WorkPlace[]
  education: Education[]
  portfolio: { label: string; url: string }[]
  visible: boolean
  hiddenByAdmin?: boolean
  updatedAt: string
}

/** Статусы отклика. Кандидат видит упрощённую цепочку, работодатель — полную воронку. */
export type ApplicationStatus = 'new' | 'viewed' | 'suitable' | 'invited' | 'interview' | 'offer' | 'hired' | 'rejected'

export interface Application {
  id: string
  vacancyId: string
  resumeId: string
  candidateId: string
  employerId: string
  coverLetter: string
  status: ApplicationStatus
  source: 'apply' | 'invite'
  createdAt: string
  updatedAt: string
}

export interface Attachment {
  name: string
  type: string
  dataUrl: string
}

export interface Message {
  id: string
  threadId: string
  fromId: string
  text: string
  attachments: Attachment[]
  createdAt: string
}

/** kind: work — работодатель↔кандидат; support — пользователь↔команда (кнопка «Написать куратору»). */
export interface Thread {
  id: string
  kind: 'work' | 'support'
  participants: string[] // для support: [userId]
  vacancyId?: string
  title: string
  updatedAt: string
  unreadFor: string[] // userId или 'staff'
}

/* ───────── Academy (по образцу Learning Platform) ───────── */

export interface Material {
  kind: string // PDF, Таблица, Скрипт…
  title: string
  url: string
}

export interface QuizQuestion {
  q: string
  options: string[]
  correct: number
}

export interface Lesson {
  id: string
  title: string
  minutes: number
  videoUrl: string
  body: string
  assignment: string
  checklist: string[]
  materials: Material[]
  timecodes: { time: string; label: string }[]
  quiz: QuizQuestion[]
  isFree: boolean
  isStop: boolean // стоп-урок: следующий откроется после принятия задания
}

export interface CourseModule {
  id: string
  title: string
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  subtitle: string
  description: string
  teacher: { name: string; title: string }
  audience: 'candidate' | 'employer' | 'all'
  category: string
  price: number
  oldPrice?: number
  durationWeeks: number
  cover: string // css-градиент
  features: string[]
  certificate: boolean
  published: boolean
  comingSoon: boolean
  modules: CourseModule[]
  createdAt: string
}

export interface Enrollment {
  id: string
  userId: string
  courseId: string
  grantedAt: string
  until?: string
  source: 'payment' | 'admin'
}

export type AnswerStatus = 'pending' | 'needs_revision' | 'accepted' | 'no_review_needed'

export interface Answer {
  id: string
  userId: string
  courseId: string
  lessonId: string
  text: string
  attachments: Attachment[]
  status: AnswerStatus
  replies: { id: string; authorId: string; text: string; createdAt: string }[]
  createdAt: string
}

export interface Certificate {
  id: string
  number: string
  userId: string
  courseId: string
  title: string
  issuedAt: string
}

/* ───────── AI-тесты ───────── */

export interface TestScale {
  id: string
  name: string
  description: string
  strengths: string[]
  weaknesses: string[]
  niche: string
  roles: string[] // подходящие ниши/профессии
  skills: string[] // какие навыки развивать
}

export interface TestOption {
  label: string
  weights: Record<string, number>
}

export interface TestQuestion {
  id: string
  text: string
  scale?: string // для шкалы Лайкерта 1–5
  options?: TestOption[] // свои варианты с весами
}

export interface TestDef {
  id: string
  title: string
  subtitle: string
  category: 'Личность' | 'Профориентация' | 'Навыки'
  kind: 'mbti' | 'scales'
  minutes: number
  enabled: boolean
  mandatory?: boolean
  scales: TestScale[]
  questions: TestQuestion[]
}

export interface TestResult {
  testId: string
  title: string
  summary: string // ENTJ / название ведущей шкалы
  scores: Record<string, number>
  top: string[] // id ведущих шкал
  completedAt: string
}

/* ───────── Контент ───────── */

export type ArticleKind = 'news' | 'advice'

export interface Article {
  id: string
  kind: ArticleKind
  audience: 'candidate' | 'employer' | 'all'
  title: string
  category: string
  excerpt: string
  body: string
  source: string
  readMinutes: number
  cover: string
  status: 'draft' | 'published'
  aiDraft?: boolean
  createdAt: string
}

/* ───────── Деньги ───────── */

export type ProductType = 'vacancy' | 'base' | 'course' | 'recruitment' | 'subscription'
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded'

export interface Payment {
  id: string
  userId: string
  product: { type: ProductType; refId?: string; label: string; meta?: Record<string, string> }
  amount: number
  method: 'kaspi' | 'card'
  promo?: string
  status: PaymentStatus
  createdAt: string
}

export interface Promo {
  code: string
  type: 'percent' | 'fixed'
  value: number
  maxUses: number
  used: number
  until?: string
  product: ProductType | 'all'
  active: boolean
}

export interface Lead {
  id: string
  type: 'recruitment' | 'subscription'
  userId?: string
  name: string
  company: string
  phone: string
  details: string
  tariff?: string
  status: 'new' | 'in_progress' | 'done'
  createdAt: string
}

export interface Notification {
  id: string
  userId: string // или 'staff'
  text: string
  link?: string
  read: boolean
  createdAt: string
}

export interface MatchWeights {
  skills: number
  experience: number
  salary: number
  location: number
  format: number
  personality: number
}

export interface Settings {
  premoderation: boolean
  weights: MatchWeights
  prices: {
    vacancy: Record<VacancyTariff, number>
    base: { month: number; year: number }
    recruitment: { basic: number; standard: number; premium: number }
  }
  whatsapp: string
  replyTemplates: string[]
}

export interface DB {
  users: User[]
  companies: Company[]
  vacancies: Vacancy[]
  resumes: Resume[]
  applications: Application[]
  threads: Thread[]
  messages: Message[]
  courses: Course[]
  enrollments: Enrollment[]
  answers: Answer[]
  certificates: Certificate[]
  tests: TestDef[]
  articles: Article[]
  payments: Payment[]
  promos: Promo[]
  leads: Lead[]
  notifications: Notification[]
  settings: Settings
  stats: { aiMatchRuns: number; aiVacancyRuns: number; aiResumeRuns: number }
}
