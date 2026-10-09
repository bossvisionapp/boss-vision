import type { AnswerStatus, ApplicationStatus, Employment, Experience, PaymentStatus, Schedule, VacancyStatus, VacancyTariff, WorkFormat } from '../types'

export type Tone = 'neutral' | 'success' | 'info' | 'warn' | 'danger' | 'brand' | 'dark'

/** Ниши платформы (ТЗ п.34) — по ним работает база резюме и тарифы доступа. */
export const NICHES = [
  'Business Assistant',
  'Personal Assistant',
  'SMM Assistant',
  'Marketing Assistant',
  'Operations Assistant',
  'Project Assistant',
  'Sales Manager',
  'Content Assistant',
]

export const NICHE_RU: Record<string, string> = {
  'Business Assistant': 'Бизнес-ассистент',
  'Personal Assistant': 'Личный ассистент',
  'SMM Assistant': 'SMM-ассистент',
  'Marketing Assistant': 'Ассистент маркетолога',
  'Operations Assistant': 'Операционный ассистент',
  'Project Assistant': 'Ассистент проектов',
  'Sales Manager': 'Менеджер по продажам',
  'Content Assistant': 'Контент-ассистент',
}

export const CITIES = ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Атырау', 'Усть-Каменогорск', 'Другой город']
export const LANGUAGES = ['Русский', 'Казахский', 'Английский', 'Турецкий', 'Китайский']
export const LANG_LEVELS = ['Базовый', 'Средний', 'Свободный', 'Родной']

export const SKILLS = [
  'Google Calendar', 'Google Sheets', 'Notion', 'Trello', 'CRM', 'Canva', 'ChatGPT', 'Zoom',
  'Деловая переписка', 'Тайм-менеджмент', 'Организация встреч', 'Организация поездок', 'Работа с документами',
  'Работа с клиентами', 'Коммуникация', 'Продажи', 'Скрипты продаж', 'Работа с возражениями', 'Переговоры',
  'Instagram', 'TikTok', 'Контент-план', 'Сторис', 'Копирайтинг', 'Таргет', 'Аналитика', 'Регламенты',
  'Управление задачами', 'Управление проектами', 'Research', 'Английский язык',
]
export const TOOLS = ['CRM', 'Notion', 'Trello', 'Google Workspace', 'Canva', 'ChatGPT', 'Excel', 'Bitrix24', 'amoCRM', 'Figma', 'CapCut', 'Telegram']

export const FORMAT_LABEL: Record<WorkFormat, string> = { office: 'Офлайн', remote: 'Онлайн', hybrid: 'Гибрид' }
export const EMPLOYMENT_LABEL: Record<Employment, string> = { full: 'Full-time', part: 'Part-time', project: 'Проектная' }
export const EXPERIENCE_LABEL: Record<Experience, string> = { none: 'Без опыта', '1-3': '1–3 года', '3-6': '3–6 лет', '6+': '6+ лет' }
export const SCHEDULE_LABEL: Record<Schedule, string> = { '5/2': '5/2', '2/2': '2/2', flex: 'Гибкий', shift: 'Сменный' }

export const COMPANY_SIZES = ['1–5', '6–20', '21–50', '51–200', '200+']
export const TURNOVERS = ['до 1 000 000 ₸', '1 000 000+ ₸', '3–5 000 000 ₸', '10 000 000+ ₸']
export const INDUSTRIES = ['Маркетинг', 'Онлайн-образование', 'Бьюти', 'Строительство', 'Торговля', 'IT', 'Недвижимость', 'Консалтинг', 'Производство', 'Другое']

/** Статусы глазами кандидата (ТЗ п.14) */
export const APP_STATUS_CANDIDATE: Record<ApplicationStatus, string> = {
  new: 'Отклик отправлен',
  viewed: 'Работодатель просмотрел',
  suitable: 'Работодатель просмотрел',
  invited: 'Приглашение',
  interview: 'Собеседование',
  offer: 'Оффер',
  hired: 'Принят',
  rejected: 'Отказ',
}
/** Статусы глазами работодателя (ТЗ п.31) */
export const APP_STATUS_EMPLOYER: Record<ApplicationStatus, string> = {
  new: 'Новые',
  viewed: 'Просмотренные',
  suitable: 'Подходящие',
  invited: 'Приглашены',
  interview: 'Собеседование',
  offer: 'Оффер',
  hired: 'Наняты',
  rejected: 'Отказ',
}
export const APP_TONE: Record<ApplicationStatus, Tone> = {
  new: 'neutral',
  viewed: 'info',
  suitable: 'info',
  invited: 'brand',
  interview: 'warn',
  offer: 'success',
  hired: 'success',
  rejected: 'danger',
}
export const CANDIDATE_PIPELINE: ApplicationStatus[] = ['new', 'viewed', 'invited', 'interview', 'offer', 'hired']

export const VACANCY_STATUS_LABEL: Record<VacancyStatus, string> = {
  draft: 'Черновик',
  moderation: 'На модерации',
  active: 'Активна',
  rejected: 'Отклонена',
  closed: 'Завершена',
  blocked: 'Заблокирована',
}
export const VACANCY_TONE: Record<VacancyStatus, Tone> = {
  draft: 'neutral',
  moderation: 'warn',
  active: 'success',
  rejected: 'danger',
  closed: 'neutral',
  blocked: 'danger',
}

export const TARIFF_INFO: Record<VacancyTariff, { label: string; perks: string[] }> = {
  standard: { label: 'STANDARD', perks: ['Публикация на 30 дней', 'Отклики в кабинете', 'Чат с кандидатами'] },
  premium: { label: 'PREMIUM', perks: ['Всё из Standard', 'Выделение в ленте', 'AI-подбор TOP-10 кандидатов'] },
  vip: { label: 'VIP', perks: ['Всё из Premium', 'Закреп в топе 7 дней', 'Рассылка подходящим кандидатам'] },
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = { pending: 'Pending', success: 'Success', failed: 'Failed', refunded: 'Refunded' }
export const PAYMENT_TONE: Record<PaymentStatus, Tone> = { pending: 'warn', success: 'success', failed: 'danger', refunded: 'neutral' }

export const ANSWER_STATUS_LABEL: Record<AnswerStatus, string> = {
  pending: 'Ждёт проверки',
  needs_revision: 'На доработке',
  accepted: 'Принято',
  no_review_needed: 'Без проверки',
}
export const ANSWER_TONE: Record<AnswerStatus, Tone> = { pending: 'danger', needs_revision: 'warn', accepted: 'success', no_review_needed: 'neutral' }

export const ROLE_LABEL = { candidate: 'Кандидат', employer: 'Предприниматель', admin: 'Администратор', curator: 'Куратор' } as const

export function money(n?: number) {
  if (n == null) return ''
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₸'
}

export function salaryRange(from?: number, to?: number) {
  if (from && to) return `${money(from).replace(' ₸', '')} – ${money(to)}`
  if (from) return `от ${money(from)}`
  if (to) return `до ${money(to)}`
  return 'По договорённости'
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  const days = Math.floor(diff / 86400)
  if (days === 1) return 'вчера'
  if (days < 7) return `${days} дн назад`
  return dateShort(iso)
}

export function dateShort(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
export function dateLong(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
export function daysLeft(iso?: string) {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

export const nowIso = () => new Date().toISOString()
export const addDays = (days: number, from = Date.now()) => new Date(from + days * 86400000).toISOString()

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

/** WhatsApp-ссылка с готовым текстом */
export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}

/** Сжимает фото до maxSide px (JPEG) — чтобы фото профиля не раздувало хранилище */
export async function resizeImage(file: File, maxSide = 420): Promise<string> {
  const src = await readFileAsDataUrl(file)
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      res(c.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => res(src)
    img.src = src
  })
}
