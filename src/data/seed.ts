import type { Application, Article, Company, DB, Resume, User, Vacancy } from '../types'
import { SEED_COURSES, lessonIds } from './courses'
import { SEED_TESTS, scoreTest } from './tests'

// Демо-данные BOSS VISION. В админке есть «Сбросить демо-данные».

const ago = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString()
const ahead = (d: number) => new Date(Date.now() + d * 86400000).toISOString()

function U(p: Partial<User> & Pick<User, 'id' | 'email' | 'name' | 'role'>): User {
  return {
    password: 'demo123',
    phone: '+7 700 000 00 00',
    city: 'Алматы',
    avatarColor: '#8a6a4d',
    createdAt: ago(30),
    lastActiveAt: ago(0, 2),
    favorites: [],
    savedNews: [],
    testResults: {},
    courseProgress: {},
    baseAccess: [],
    interests: [],
    settings: { theme: 'classic', mode: 'auto', push: true, email: true, whatsapp: false },
    activity: [],
    onboarded: true,
    phoneVerified: true,
    emailVerified: true,
    consentAt: ago(30),
    ...p,
  }
}

/** Готовый результат теста по «ответам» для демо-пользователей */
function result(testId: string, pattern: (scale: string) => number) {
  const t = SEED_TESTS.find((x) => x.id === testId)!
  const answers = Object.fromEntries(t.questions.map((q) => [q.id, pattern(q.scale ?? '')]))
  const r = scoreTest(t, answers)
  return { testId, title: t.title, completedAt: ago(5), ...r }
}
const mbtiFor = (type: string) => result('mbti', (s) => (type.includes(s) ? 5 : 2))

const miniLessons = lessonIds(SEED_COURSES[0])
const startLessons = lessonIds(SEED_COURSES[2])

const users: User[] = [
  U({
    id: 'u_alina', email: 'alina@demo.kz', name: 'Алина Серикова', role: 'candidate', phone: '+7 701 123 45 67', age: 24,
    avatarColor: '#9b6b52', favorites: ['v_ba'], interests: ['Business Assistant'],
    testResults: { mbti: mbtiFor('ENTJ'), gallup: result('gallup', (s) => (s === 'exec' ? 5 : s === 'strategy' ? 4 : 3)) },
    courseProgress: { c_miniboss: miniLessons.slice(0, 22), c_start: startLessons },
    activity: [{ at: ago(0, 3), text: 'Откликнулась на «Бизнес-ассистент»' }, { at: ago(1), text: 'Прошла урок «Платёжный календарь»' }],
  }),
  U({ id: 'u_aigerim', email: 'aigerim@demo.kz', name: 'Айгерим Нурболатова', role: 'employer', phone: '+7 702 555 11 22', avatarColor: '#3a2f27', companyId: 'co_vision', baseAccess: [{ niche: 'Business Assistant', until: ahead(21) }] }),
  U({ id: 'u_admin', email: 'admin@demo.kz', password: 'admin123', name: 'Анар Мырзан', role: 'admin', phone: '+7 776 333 06 53', avatarColor: '#b08d57', createdAt: ago(200) }),
  U({ id: 'u_curator', email: 'curator@demo.kz', name: 'Дана Куратор', role: 'curator', avatarColor: '#5f6f63', createdAt: ago(90) }),
  U({ id: 'u_daniyar', email: 'daniyar@demo.kz', name: 'Данияр Ахметов', role: 'employer', avatarColor: '#4d6b8a', companyId: 'co_digital', createdAt: ago(45) }),
  ...(
    [
      ['u_arina', 'Арина Касымова', 'Алматы', '#a3775c', 'ESFJ'],
      ['u_madina', 'Мадина Каримова', 'Астана', '#6f7d8c', 'ISFJ'],
      ['u_timur', 'Тимур Жуманов', 'Астана', '#7c6a4f', 'ENFP'],
      ['u_dana', 'Дана Есенова', 'Шымкент', '#8c5f5f', 'ESTP'],
      ['u_erlan', 'Ерлан Касымов', 'Алматы', '#5f7c6a', 'ISTJ'],
      ['u_aruzhan', 'Аружан Серикова', 'Алматы', '#7a6688', 'ESTJ'],
      ['u_zhansaya', 'Жансая Наренова', 'Алматы', '#8a6a4d', ''],
    ] as const
  ).map(([id, name, city, color, type], i) =>
    U({
      id, name, city, role: 'candidate', email: `${id.slice(2)}@demo.kz`, avatarColor: color, age: 21 + i * 2,
      phone: `+7 70${i} 4${i}0 ${10 + i} ${20 + i}`, createdAt: ago(25 - i * 3),
      testResults: type ? { mbti: mbtiFor(type) } : {},
    }),
  ),
]

const companies: Company[] = [
  { id: 'co_vision', ownerId: 'u_aigerim', name: 'ТОО Vision Group', employees: '21–50', industry: 'Консалтинг', city: 'Алматы', turnover: '10 000 000+ ₸', about: 'Консалтинговая группа: стратегия, маркетинг и операционное управление для МСБ.' },
  { id: 'co_digital', ownerId: 'u_daniyar', name: 'ТОО Digital Marketing', employees: '6–20', industry: 'Маркетинг', city: 'Алматы', turnover: '3–5 000 000 ₸', about: 'Маркетинговое агентство полного цикла.' },
]

const V = (p: Partial<Vacancy> & Pick<Vacancy, 'id' | 'title' | 'category'>): Vacancy => ({
  companyId: 'co_vision', ownerId: 'u_aigerim', city: 'Алматы', format: 'hybrid', employment: 'full', experience: '1-3', schedule: '5/2',
  languages: ['Русский', 'Казахский'], skills: [], description: '', duties: [], requirements: [], extra: '',
  contactName: 'Айгерим', contactPhone: '+7 702 555 11 22', whatsapp: '+7 702 555 11 22', contactEmail: 'hr@visiongroup.kz',
  status: 'active', tariff: 'standard', views: 0, saves: 0, createdAt: ago(1), expiresAt: ahead(29), ...p,
})

const vacancies: Vacancy[] = [
  V({
    id: 'v_ba', title: 'Бизнес-ассистент', category: 'Business Assistant', salaryFrom: 300000, salaryTo: 500000, tariff: 'vip', views: 412, saves: 38, createdAt: ago(0, 3),
    skills: ['Google Calendar', 'Notion', 'Google Sheets', 'Деловая переписка', 'Организация встреч', 'CRM'],
    description: 'Мы ищем проактивного бизнес-ассистента, который будет поддерживать CEO, организовывать встречи, вести документы и помогать в операционных задачах.',
    duties: ['Организация встреч и поездок', 'Ведение календаря', 'Работа с документами', 'Research и аналитика', 'Координация команды'],
    requirements: ['Опыт от 1 года', 'Уверенный Google Workspace', 'Английский — средний'], languages: ['Русский', 'Английский'],
    extra: 'Будет плюсом опыт в консалтинге. Офис в БЦ Esentai, 2 дня удалённо.', startDate: ahead(14),
  }),
  V({ id: 'v_pa', title: 'Project Assistant', category: 'Project Assistant', companyId: 'co_digital', ownerId: 'u_daniyar', city: 'Астана', format: 'remote', employment: 'part', salaryFrom: 250000, salaryTo: 400000, tariff: 'premium', views: 233, saves: 14, createdAt: ago(1),
    skills: ['Trello', 'Notion', 'Управление проектами', 'Zoom'], description: 'Ассистент проектного офиса агентства.', duties: ['Ведение задач в Trello', 'Протоколы встреч', 'Контроль сроков'], requirements: ['Системность', 'Опыт с таск-трекерами'], contactName: 'Данияр', contactEmail: 'hr@digital.kz' }),
  V({ id: 'v_exec', title: 'Ассистент руководителя', category: 'Personal Assistant', format: 'office', salaryFrom: 400000, salaryTo: 600000, experience: '3-6', views: 301, saves: 22, createdAt: ago(2),
    skills: ['Google Calendar', 'Организация поездок', 'Деловая переписка', 'Английский язык'], description: 'Личный ассистент основателя группы компаний.', duties: ['Календарь и встречи', 'Поездки и визы', 'Личные поручения'], requirements: ['Опыт 3+ года', 'Конфиденциальность'], languages: ['Русский', 'Английский'] }),
  V({ id: 'v_smm', title: 'SMM-ассистент', category: 'SMM Assistant', companyId: 'co_digital', ownerId: 'u_daniyar', format: 'remote', salaryFrom: 180000, salaryTo: 280000, experience: 'none', tariff: 'premium', views: 540, saves: 61, createdAt: ago(0, 6),
    skills: ['Instagram', 'Контент-план', 'Canva', 'Сторис', 'ChatGPT'], description: 'Помощь SMM-менеджеру в ведении 3 проектов. Обучим.', duties: ['Публикации', 'Сторис', 'Ответы в директ'], requirements: ['Насмотренность', 'Canva / CapCut'], contactName: 'Данияр', contactEmail: 'hr@digital.kz' }),
  V({ id: 'v_sales', title: 'Менеджер по продажам', category: 'Sales Manager', salaryFrom: 250000, salaryTo: 700000, format: 'hybrid', views: 388, saves: 19, createdAt: ago(3),
    skills: ['Продажи', 'Скрипты продаж', 'CRM', 'Работа с возражениями', 'Переговоры'], description: 'Оклад + процент. Тёплые заявки из рекламы. Обучение в Sales Boss за счёт компании.', duties: ['Обработка заявок', 'Созвоны', 'Ведение сделок в CRM'], requirements: ['Опыт продаж от 1 года'] }),
  V({ id: 'v_ops', title: 'Операционный ассистент', category: 'Operations Assistant', city: 'Астана', format: 'remote', salaryFrom: 220000, salaryTo: 350000, views: 156, saves: 9, createdAt: ago(4),
    skills: ['CRM', 'Google Sheets', 'Регламенты', 'Управление задачами'], description: 'Порядок в процессах компании.', duties: ['Регламенты', 'Отчёты', 'Контроль задач'], requirements: ['Системность'] }),
  V({ id: 'v_content', title: 'Контент-ассистент', category: 'Content Assistant', companyId: 'co_digital', ownerId: 'u_daniyar', format: 'remote', employment: 'project', salaryFrom: 150000, salaryTo: 220000, experience: 'none', views: 120, saves: 7, createdAt: ago(5),
    skills: ['Копирайтинг', 'Canva', 'ChatGPT', 'Контент-план'], description: 'Тексты и визуал для экспертов.', duties: ['Посты', 'Карусели', 'Сценарии рилс'], requirements: ['Грамотность'], contactName: 'Данияр', contactEmail: 'hr@digital.kz' }),
  V({ id: 'v_mkt', title: 'Ассистент маркетолога', category: 'Marketing Assistant', salaryFrom: 200000, salaryTo: 320000, status: 'moderation', createdAt: ago(0, 1),
    skills: ['Таргет', 'Аналитика', 'Google Sheets'], description: 'Новая вакансия — на модерации.', duties: ['Отчёты по рекламе'], requirements: ['Базовый маркетинг'] }),
  V({ id: 'v_draft', title: 'Ассистент в отдел HR', category: 'Business Assistant', status: 'draft', createdAt: ago(0, 5), description: 'Черновик вакансии.', skills: ['Коммуникация'] }),
]

function R(p: Partial<Resume> & Pick<Resume, 'id' | 'userId' | 'fullName' | 'position' | 'category'>): Resume {
  return {
    city: 'Алматы', phone: '', email: '', telegram: '', whatsapp: '', goal: '', about: '', format: 'hybrid', employment: 'full', experience: '1-3',
    skills: [], tools: [], languages: [{ name: 'Русский', level: 'Родной' }, { name: 'Казахский', level: 'Свободный' }], work: [], education: [], portfolio: [],
    visible: true, updatedAt: ago(2), ...p,
  }
}

const resumes: Resume[] = [
  R({
    id: 'r_alina', userId: 'u_alina', fullName: 'Алина Серикова', position: 'Бизнес-ассистент', category: 'Business Assistant', age: 24,
    phone: '+7 701 123 45 67', email: 'alina@example.com', telegram: '@alina_s', whatsapp: '+7 701 123 45 67', salary: 350000,
    goal: 'Вырасти до операционного менеджера в международной компании',
    about: 'Организованный и проактивный бизнес-ассистент с опытом работы в стартапах и международных компаниях.',
    skills: ['Google Sheets', 'Notion', 'Trello', 'CRM', 'Canva', 'ChatGPT', 'Коммуникация', 'Организация встреч'],
    tools: ['Google Workspace', 'Notion', 'Trello', 'ChatGPT'],
    languages: [{ name: 'Русский', level: 'Родной' }, { name: 'Казахский', level: 'Свободный' }, { name: 'Английский', level: 'Средний' }],
    work: [{ company: 'ТОО Vision Group', position: 'Бизнес-ассистент', period: 'Сен 2023 — н.в.', duties: 'Календарь CEO, встречи, документы, протоколы', achievements: 'Сократила время подготовки отчётов на 40% через шаблоны в Google Sheets' }],
    education: [{ place: 'КазНУ им. аль-Фараби', specialty: 'Менеджмент', year: '2021' }],
    portfolio: [{ label: 'Instagram', url: 'https://instagram.com' }, { label: 'Google Drive', url: 'https://drive.google.com' }],
    updatedAt: ago(1),
  }),
  R({ id: 'r_arina', userId: 'u_arina', fullName: 'Арина Касымова', position: 'Бизнес-ассистент', category: 'Business Assistant', salary: 280000, experience: '1-3',
    about: 'Помогаю предпринимателям держать фокус: календарь, клиенты, Canva-материалы.', skills: ['Canva', 'Google Calendar', 'Работа с клиентами', 'Коммуникация', 'Деловая переписка'], tools: ['Canva', 'Google Workspace'],
    work: [{ company: 'Beauty Lab', position: 'Администратор', period: '2022 — 2024', duties: 'Запись клиентов, CRM', achievements: 'Повторные визиты +25%' }], education: [{ place: 'Narxoz', specialty: 'Экономика', year: '2022' }] }),
  R({ id: 'r_madina', userId: 'u_madina', fullName: 'Мадина Каримова', position: 'Личный ассистент', category: 'Personal Assistant', city: 'Астана', format: 'remote', salary: 300000, experience: '3-6',
    about: 'Помогаю экспертам освобождать время. Удалённо, гибкий график.', skills: ['Google Calendar', 'Организация поездок', 'Деловая переписка', 'Английский язык', 'ChatGPT'], tools: ['Google Workspace', 'ChatGPT'],
    languages: [{ name: 'Русский', level: 'Родной' }, { name: 'Английский', level: 'Свободный' }] }),
  R({ id: 'r_timur', userId: 'u_timur', fullName: 'Тимур Жуманов', position: 'SMM-специалист', category: 'SMM Assistant', city: 'Астана', format: 'remote', salary: 300000, experience: '3-6',
    about: 'Веду Instagram и TikTok брендов, 4 года опыта.', skills: ['Instagram', 'TikTok', 'Контент-план', 'Canva', 'Сторис', 'Таргет'], tools: ['Canva', 'CapCut'] }),
  R({ id: 'r_dana', userId: 'u_dana', fullName: 'Дана Есенова', position: 'Менеджер по продажам', category: 'Sales Manager', city: 'Шымкент', format: 'remote', salary: 300000,
    about: 'Закрываю сделки в онлайн-образовании, конверсия 18%.', skills: ['Продажи', 'Скрипты продаж', 'CRM', 'Работа с возражениями'], tools: ['amoCRM'] }),
  R({ id: 'r_erlan', userId: 'u_erlan', fullName: 'Ерлан Касымов', position: 'Операционный ассистент', category: 'Operations Assistant', experience: 'none', salary: 180000,
    about: 'Выпускник Mini Boss Academy. Люблю порядок и таблицы.', skills: ['Google Sheets', 'Регламенты', 'Trello', 'ChatGPT'], tools: ['Google Workspace', 'Trello'] }),
  R({ id: 'r_aruzhan', userId: 'u_aruzhan', fullName: 'Аружан Серикова', position: 'Ассистент проектов', category: 'Project Assistant', experience: '3-6', salary: 380000, format: 'hybrid',
    about: 'Веду проекты агентства: сроки, команда, отчёты.', skills: ['Управление проектами', 'Notion', 'Trello', 'Zoom', 'Регламенты'], tools: ['Notion', 'Trello'] }),
  R({ id: 'r_zhansaya', userId: 'u_zhansaya', fullName: 'Жансая Наренова', position: 'Контент-ассистент', category: 'Content Assistant', format: 'remote', experience: 'none', salary: 160000,
    about: 'Пишу тексты и делаю карусели.', skills: ['Копирайтинг', 'Canva', 'ChatGPT'], tools: ['Canva'] }),
]

const A = (p: Partial<Application> & Pick<Application, 'id' | 'vacancyId' | 'resumeId' | 'candidateId' | 'employerId' | 'status'>): Application => ({
  coverLetter: '', source: 'apply', createdAt: ago(1), updatedAt: ago(0, 5), ...p,
})

const applications: Application[] = [
  A({ id: 'a1', vacancyId: 'v_ba', resumeId: 'r_alina', candidateId: 'u_alina', employerId: 'u_aigerim', status: 'interview', coverLetter: 'Здравствуйте! Откликаюсь на вакансию бизнес-ассистента — уже 2 года работаю с CEO.', createdAt: ago(3) }),
  A({ id: 'a2', vacancyId: 'v_pa', resumeId: 'r_alina', candidateId: 'u_alina', employerId: 'u_daniyar', status: 'viewed', createdAt: ago(2) }),
  A({ id: 'a3', vacancyId: 'v_ba', resumeId: 'r_arina', candidateId: 'u_arina', employerId: 'u_aigerim', status: 'new', createdAt: ago(0, 4), coverLetter: 'Готова выйти через неделю.' }),
  A({ id: 'a4', vacancyId: 'v_ba', resumeId: 'r_erlan', candidateId: 'u_erlan', employerId: 'u_aigerim', status: 'suitable', createdAt: ago(1) }),
  A({ id: 'a5', vacancyId: 'v_exec', resumeId: 'r_madina', candidateId: 'u_madina', employerId: 'u_aigerim', status: 'offer', createdAt: ago(6) }),
  A({ id: 'a6', vacancyId: 'v_sales', resumeId: 'r_dana', candidateId: 'u_dana', employerId: 'u_aigerim', status: 'hired', source: 'invite', createdAt: ago(12), updatedAt: ago(4) }),
  A({ id: 'a7', vacancyId: 'v_ops', resumeId: 'r_aruzhan', candidateId: 'u_aruzhan', employerId: 'u_aigerim', status: 'rejected', createdAt: ago(7) }),
]

const N = (p: Omit<Article, 'status' | 'audience' | 'source' | 'cover'> & Partial<Article>): Article => ({
  status: 'published', audience: 'all', source: 'BOSS VISION Media', cover: 'linear-gradient(135deg,#2a241f,#8a6a4d)', ...p,
})

const articles: Article[] = [
  N({ id: 'n1', kind: 'news', title: 'Спрос на бизнес-ассистентов в Казахстане вырос на 34%', category: 'HR', excerpt: 'МСБ активнее делегирует операционку: ассистенты входят в топ-5 востребованных профессий.', body: 'Малый и средний бизнес всё активнее нанимает ассистентов. Предприниматели отмечают, что один сильный помощник возвращает 2–4 часа в день.\n\nНаибольший спрос — в Алматы и Астане, растёт доля удалённых вакансий.', readMinutes: 3, createdAt: ago(0, 8), source: 'HR-аналитика BOSS VISION', cover: 'linear-gradient(135deg,#2a241f,#b08d57)' }),
  N({ id: 'n2', kind: 'news', title: '5 трендов маркетинга 2026 года', category: 'Маркетинг', excerpt: 'AI-контент, короткие видео, закрытые сообщества и UGC.', body: 'Главные тренды: генерация контента с ИИ, вертикальные видео, Telegram-каналы, UGC и персонализация.', readMinutes: 4, createdAt: ago(1), cover: 'linear-gradient(135deg,#3a2f27,#a97d5a)' }),
  N({ id: 'n3', kind: 'news', title: 'Как ИИ меняет работу ассистента', category: 'AI', excerpt: 'Рутину забирают нейросети, ценность — в коммуникации и контроле.', body: 'ИИ взял на себя черновую работу, но ответственность и коммуникация остаются за человеком. Ассистент со знанием AI стоит дороже.', readMinutes: 3, createdAt: ago(2), cover: 'linear-gradient(135deg,#1f2622,#5f7c6a)' }),
  N({ id: 'n4', kind: 'news', title: 'Продажи в WhatsApp: новые правила', category: 'Продажи', excerpt: 'Скорость ответа решает: каждый час ожидания снижает конверсию.', body: 'Отвечайте в течение 5 минут, используйте шаблоны и голосовые с осторожностью.', readMinutes: 4, createdAt: ago(3), cover: 'linear-gradient(135deg,#2b2320,#7a4f3a)' }),
  N({ id: 'n5', kind: 'news', title: 'Казахстанские стартапы привлекли рекордные инвестиции', category: 'Стартапы', excerpt: 'Astana Hub отчитался о росте венчурных сделок.', body: 'Рост числа сделок и выход на рынки Центральной Азии.', readMinutes: 3, createdAt: ago(4), cover: 'linear-gradient(135deg,#1f2733,#4b6178)' }),
  N({ id: 'n6', kind: 'news', title: 'Онлайн-школы: что продаётся осенью', category: 'Инфобизнес', excerpt: 'Профессии с быстрым выходом на доход — в лидерах.', body: 'Курсы профессий с трудоустройством продаются лучше развлекательных.', readMinutes: 3, createdAt: ago(5) }),
  N({ id: 'n7', kind: 'news', title: 'Как пройти собеседование без опыта', category: 'Карьера', excerpt: 'Рассказ о себе, кейсы из учёбы и правильные вопросы работодателю.', body: 'Готовьте 3 истории: как решили проблему, как учились новому и как работали в команде.', readMinutes: 5, createdAt: ago(6) }),
  N({ id: 'n8', kind: 'news', title: 'Бизнес в регионах: где открываться в 2026', category: 'Бизнес', excerpt: 'Шымкент и Актобе — самые быстрорастущие рынки.', body: 'Аренда дешевле, конкуренция ниже, спрос растёт.', readMinutes: 4, createdAt: ago(7), cover: 'linear-gradient(135deg,#2c2433,#6e5a7c)' }),
  // Advice — предпринимателю
  N({ id: 'ad1', kind: 'advice', audience: 'employer', title: 'Как выбрать ассистента: 7 вопросов до найма', category: 'Команда', excerpt: 'Профиль должности, задачи, график и характер.', body: 'Ответьте до публикации: какие задачи отдаёте, сколько часов, офис или онлайн, обязательные инструменты, нужный характер (используйте AI-тесты BOSS VISION), бюджет, как будете обучать.', readMinutes: 4, createdAt: ago(2) }),
  N({ id: 'ad2', kind: 'advice', audience: 'employer', title: 'Делегирование без потери контроля', category: 'Команда', excerpt: 'Матрица задач и правило «сначала регламент».', body: 'Записывайте задачу один раз в виде регламента — и отдавайте навсегда.', readMinutes: 5, createdAt: ago(3) }),
  N({ id: 'ad3', kind: 'advice', audience: 'employer', title: 'Оффер, который покупают', category: 'Маркетинг', excerpt: 'Боль клиента → результат → доказательство → дедлайн.', body: 'Сильный оффер говорит о результате клиента, а не о вашем продукте.', readMinutes: 4, createdAt: ago(4) }),
  N({ id: 'ad4', kind: 'advice', audience: 'employer', title: 'Ответ на «дорого»: 5 скриптов', category: 'Продажи', excerpt: 'Сравнение, разбивка, ценность, гарантия, выбор.', body: 'Не спорьте — уточните, с чем сравнивает клиент, и покажите ценность.', readMinutes: 4, createdAt: ago(5) }),
  N({ id: 'ad5', kind: 'advice', audience: 'employer', title: 'KPI для ассистента', category: 'Системы', excerpt: 'Что измерять, чтобы видеть пользу.', body: 'Сроки задач, часы, сэкономленные руководителю, качество документов.', readMinutes: 3, createdAt: ago(6) }),
  N({ id: 'ad6', kind: 'advice', audience: 'employer', title: 'AI пишет вакансию за вас', category: 'AI', excerpt: 'Как пользоваться «Создать вакансию через AI».', body: 'Опишите задачу обычными словами — AI соберёт обязанности, требования, навыки и вилку.', readMinutes: 2, createdAt: ago(7) }),
  // Advice — кандидату
  N({ id: 'ac1', kind: 'advice', audience: 'candidate', title: 'Резюме без опыта: что писать', category: 'Резюме', excerpt: 'Учёба, проекты, волонтёрство и курсы — тоже опыт.', body: 'Покажите навыки через учебные проекты, курс Mini Boss и тестовые задания.', readMinutes: 4, createdAt: ago(1) }),
  N({ id: 'ac2', kind: 'advice', audience: 'candidate', title: 'Как написать работодателю, чтобы ответили', category: 'Поиск работы', excerpt: 'Коротко, по делу, с пользой для бизнеса.', body: 'Имя → почему эта компания → чем полезны → вопрос.', readMinutes: 3, createdAt: ago(2) }),
  N({ id: 'ac3', kind: 'advice', audience: 'candidate', title: 'Рассказ о себе за 60 секунд', category: 'Собеседование', excerpt: 'Формула «прошлое — настоящее — будущее».', body: 'Кем были, что умеете сейчас, куда растёте и почему здесь.', readMinutes: 3, createdAt: ago(3) }),
  N({ id: 'ac4', kind: 'advice', audience: 'candidate', title: 'Переговоры о зарплате', category: 'Собеседование', excerpt: 'Называйте вилку и аргументы.', body: 'Изучите рынок, назовите вилку, аргументируйте навыками и сертификатами.', readMinutes: 4, createdAt: ago(4) }),
  N({ id: 'ac5', kind: 'advice', audience: 'candidate', title: '10 привычек продуктивного ассистента', category: 'Личное развитие', excerpt: 'Утро, план, фокус, отчёт.', body: 'План дня с вечера, одна главная задача, отчёт руководителю в конце дня.', readMinutes: 4, createdAt: ago(5) }),
  N({ id: 'ac6', kind: 'advice', audience: 'candidate', title: 'AI для подготовки к интервью', category: 'AI', excerpt: 'Тренируйтесь с ChatGPT как с рекрутером.', body: 'Попросите AI задать 10 вопросов по вакансии и оценить ваши ответы.', readMinutes: 3, createdAt: ago(6) }),
]

export function createSeed(): DB {
  return {
    users,
    companies,
    vacancies,
    resumes,
    applications,
    threads: [
      { id: 'th1', kind: 'work', participants: ['u_alina', 'u_aigerim'], vacancyId: 'v_ba', title: 'Бизнес-ассистент', updatedAt: ago(0, 2), unreadFor: ['u_alina'] },
      { id: 'th2', kind: 'support', participants: ['u_alina'], title: 'Вопрос по Mini Boss', updatedAt: ago(0, 6), unreadFor: ['staff'] },
    ],
    messages: [
      { id: 'm1', threadId: 'th1', fromId: 'u_alina', text: 'Здравствуйте! Спасибо за приглашение.', attachments: [], createdAt: ago(1) },
      { id: 'm2', threadId: 'th1', fromId: 'u_aigerim', text: 'Алина, добрый день! Приглашаем на собеседование в четверг в 15:00, офис Esentai Tower. Удобно?', attachments: [], createdAt: ago(0, 2) },
      { id: 'm3', threadId: 'th2', fromId: 'u_alina', text: 'Здравствуйте! Где скачать шаблон платёжного календаря из урока?', attachments: [], createdAt: ago(0, 6) },
    ],
    courses: SEED_COURSES,
    enrollments: [
      { id: 'e1', userId: 'u_alina', courseId: 'c_miniboss', grantedAt: ago(40), source: 'payment' },
      { id: 'e2', userId: 'u_erlan', courseId: 'c_miniboss', grantedAt: ago(80), source: 'payment' },
      { id: 'e3', userId: 'u_dana', courseId: 'c_sales', grantedAt: ago(60), source: 'admin' },
    ],
    answers: [
      { id: 'ans1', userId: 'u_alina', courseId: 'c_miniboss', lessonId: SEED_COURSES[0].modules[0].lessons[1].id, text: 'Уже есть: надёжность, пунктуальность, конфиденциальность. Развить: проактивность и английский.', attachments: [], status: 'accepted', replies: [{ id: 'rp1', authorId: 'u_curator', text: 'Отличный разбор! Для проактивности попробуйте каждую неделю предлагать руководителю 1 улучшение.', createdAt: ago(20) }], createdAt: ago(21) },
      { id: 'ans2', userId: 'u_alina', courseId: 'c_miniboss', lessonId: SEED_COURSES[0].modules[2].lessons[2].id, text: 'План недели во вложении: встречи сгруппировала по дням, пятница — день отчётов.', attachments: [], status: 'pending', replies: [], createdAt: ago(0, 9) },
      { id: 'ans3', userId: 'u_erlan', courseId: 'c_miniboss', lessonId: SEED_COURSES[0].modules[1].lessons[0].id, text: 'Переписал 3 сообщения по шаблону.', attachments: [], status: 'needs_revision', replies: [{ id: 'rp2', authorId: 'u_curator', text: 'Второе сообщение слишком длинное — сократите до 3 предложений.', createdAt: ago(2) }], createdAt: ago(3) },
    ],
    certificates: [{ id: 'cert1', number: 'BV-2026-0147', userId: 'u_alina', courseId: 'c_start', title: 'Старт карьеры — резюме и собеседование', issuedAt: ago(15) }],
    tests: SEED_TESTS,
    articles,
    payments: [
      { id: 'PAY-1001', userId: 'u_alina', product: { type: 'course', refId: 'c_miniboss', label: 'Mini Boss Academy' }, amount: 150000, method: 'kaspi', status: 'success', createdAt: ago(40) },
      { id: 'PAY-1002', userId: 'u_aigerim', product: { type: 'vacancy', refId: 'v_ba', label: 'Вакансия VIP — Бизнес-ассистент' }, amount: 30000, method: 'card', status: 'success', createdAt: ago(0, 3) },
      { id: 'PAY-1003', userId: 'u_aigerim', product: { type: 'base', label: 'База резюме — Business Assistant, 1 месяц', meta: { niche: 'Business Assistant', period: 'month' } }, amount: 20000, method: 'kaspi', status: 'success', createdAt: ago(9) },
      { id: 'PAY-1004', userId: 'u_daniyar', product: { type: 'vacancy', refId: 'v_smm', label: 'Вакансия PREMIUM — SMM-ассистент' }, amount: 12000, method: 'kaspi', promo: 'BOSS20', status: 'success', createdAt: ago(1) },
      { id: 'PAY-1005', userId: 'u_erlan', product: { type: 'course', refId: 'c_miniboss', label: 'Mini Boss Academy' }, amount: 150000, method: 'card', status: 'success', createdAt: ago(80) },
      { id: 'PAY-1006', userId: 'u_zhansaya', product: { type: 'course', refId: 'c_sales', label: 'Sales Boss' }, amount: 120000, method: 'card', status: 'failed', createdAt: ago(2) },
    ],
    promos: [
      { code: 'BOSS20', type: 'percent', value: 20, maxUses: 100, used: 14, until: ahead(60), product: 'all', active: true },
      { code: 'MINIBOSS', type: 'fixed', value: 30000, maxUses: 50, used: 3, until: ahead(30), product: 'course', active: true },
    ],
    leads: [
      { id: 'ld1', type: 'recruitment', userId: 'u_daniyar', name: 'Данияр Ахметов', company: 'ТОО Digital Marketing', phone: '+7 702 222 33 44', details: 'Нужен SMM-менеджер и ассистент', tariff: 'Стандарт — 300 000 ₸', status: 'in_progress', createdAt: ago(2) },
      { id: 'ld2', type: 'subscription', name: 'Рустем Итемиров', company: 'Строительная платформа', phone: '+7 705 111 22 33', details: 'Нужно нанять 5 человек: продажи и ассистенты', status: 'new', createdAt: ago(0, 7) },
    ],
    notifications: [
      { id: 'nt1', userId: 'u_alina', text: 'Приглашение на собеседование: «Бизнес-ассистент», ТОО Vision Group', link: '/chats/th1', read: false, createdAt: ago(0, 2) },
      { id: 'nt2', userId: 'u_alina', text: 'AI подобрал 3 новые вакансии с совпадением 80%+', link: '/jobs?sort=match', read: false, createdAt: ago(0, 9) },
      { id: 'nt3', userId: 'u_aigerim', text: 'Новый отклик на «Бизнес-ассистент» от Арины К.', link: '/employer/applicants', read: false, createdAt: ago(0, 4) },
      { id: 'nt4', userId: 'staff', text: 'Новое задание на проверку: Mini Boss — «Планирование недели руководителя»', link: '/admin?s=academy&i=answers', read: false, createdAt: ago(0, 9) },
    ],
    settings: {
      premoderation: false,
      weights: { skills: 30, experience: 20, salary: 15, location: 15, format: 10, personality: 10 },
      prices: { vacancy: { standard: 5000, premium: 15000, vip: 30000 }, base: { month: 20000, year: 150000 }, recruitment: { basic: 150000, standard: 300000, premium: 500000 } },
      whatsapp: '+7 776 333 06 53',
      replyTemplates: ['Отличная работа! Задание принято ✅', 'Хорошее начало, но нужно доработать: ', 'Посмотрите ещё раз видео с тайм-кода — там ответ на ваш вопрос.'],
    },
    stats: { aiMatchRuns: 37, aiVacancyRuns: 12, aiResumeRuns: 58 },
  }
}
