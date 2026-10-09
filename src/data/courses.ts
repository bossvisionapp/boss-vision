import type { Course, CourseModule, Lesson } from '../types'

// Academy: Mini Boss и Sales Boss + курсы «скоро». Структура уроков — как в Learning Platform:
// видео, описание, материалы, задание (уходит куратору в «Ленту ответов»), чек-лист, тест, стоп-урок.

let ln = 0
function L(title: string, p: Partial<Lesson> = {}): Lesson {
  ln++
  return {
    id: `l${ln}`,
    title,
    minutes: 8 + ((ln * 5) % 14),
    videoUrl: '',
    body: `${title}. В этом уроке разбираем тему на реальных примерах из работы ассистентов и предпринимателей Казахстана.\nСмотрите видео, скачивайте материалы и выполняйте практическое задание — куратор проверит его и даст обратную связь.`,
    assignment: '',
    checklist: ['Посмотреть видео до конца', 'Скачать материалы урока', 'Выполнить задание и отправить куратору'],
    materials: [],
    timecodes: [],
    quiz: [],
    isFree: false,
    isStop: false,
    ...p,
  }
}

const M = (id: string, title: string, lessons: Lesson[]): CourseModule => ({ id, title, lessons })

const MATERIALS = {
  pdf: (t: string) => ({ kind: 'PDF', title: t, url: '#' }),
  sheet: (t: string) => ({ kind: 'Таблица', title: t, url: '#' }),
  doc: (t: string) => ({ kind: 'Документ', title: t, url: '#' }),
}

const miniboss: Course = {
  id: 'c_miniboss',
  title: 'Mini Boss Academy',
  subtitle: 'Профессия бизнес-ассистента',
  description: 'Полная программа профессии бизнес-ассистента: от основ до трудоустройства. Практика на реальных задачах предпринимателей, домашние задания с проверкой куратора и сертификат BOSS VISION.',
  teacher: { name: 'Анар Мырзан', title: 'Основатель BOSS VISION, 100+ подобранных команд' },
  audience: 'candidate',
  category: 'Ассистенты',
  price: 150000,
  oldPrice: 190000,
  durationWeeks: 8,
  cover: 'linear-gradient(135deg,#3a2f27 0%,#8a6a4d 55%,#d8bf98 100%)',
  features: ['10 модулей и 30 уроков', 'Домашние задания с проверкой куратора', 'Шаблоны, чек-листы и регламенты', 'Помощь с трудоустройством', 'Сертификат BOSS VISION'],
  certificate: true,
  published: true,
  comingSoon: false,
  createdAt: '2026-05-01T00:00:00.000Z',
  modules: [
    M('mb1', 'Основы профессии ассистента', [
      L('Ассистент деген кім?', {
        isFree: true,
        body: 'Кто такой бизнес-ассистент и чем он отличается от секретаря.\nКакие задачи предприниматель отдаёт ассистенту в первую очередь.\nСколько зарабатывают ассистенты в Казахстане и как растут дальше.',
        materials: [MATERIALS.pdf('Карта профессии ассистента')],
        timecodes: [{ time: '0:40', label: 'Кто такой ассистент' }, { time: '4:15', label: 'Задачи и зарплаты' }, { time: '9:30', label: 'Карьерный рост' }],
        quiz: [{ q: 'Главная цель бизнес-ассистента?', options: ['Отвечать на звонки', 'Освобождать время руководителя для роста бизнеса', 'Вести бухгалтерию'], correct: 1 }],
      }),
      L('Идеал ассистент бейнесі', {
        isFree: true,
        body: 'Портрет идеального ассистента глазами предпринимателя.\nКачества, которые ценят больше всего: надёжность, проактивность, конфиденциальность.\nЧек-лист самопроверки.',
        assignment: 'Опишите себя через 5 качеств идеального ассистента: какие уже есть, какие нужно развить. Пришлите ответ куратору.',
        materials: [MATERIALS.pdf('Чек-лист «Идеальный ассистент»')],
      }),
      L('Типы ассистентов и ниши', { materials: [MATERIALS.pdf('Сравнение ниш и зарплат')] }),
    ]),
    M('mb2', 'Коммуникация', [
      L('Деловая переписка и этикет', { assignment: 'Перепишите 3 сообщения клиенту по шаблону из урока.', materials: [MATERIALS.doc('Шаблоны сообщений')] }),
      L('Общение с руководителем'),
      L('Работа с клиентами и конфликтами', { isStop: true, assignment: 'Разберите конфликтную ситуацию из урока по схеме «факт — эмоция — решение».' }),
    ]),
    M('mb3', 'Планирование', [L('Тайм-менеджмент и правило 6П'), L('Kaizen и Pomodoro'), L('Планирование недели руководителя', { assignment: 'Составьте план недели руководителя по примеру.' , materials: [MATERIALS.sheet('Шаблон планирования недели')] })]),
    M('mb4', 'Документы и организация', [L('Договоры, счета, акты'), L('Google Workspace для ассистента'), L('Архив и порядок в файлах')]),
    M('mb5', 'AI-инструменты', [L('ChatGPT для ассистента', { materials: [MATERIALS.pdf('50 промптов для ассистента')] }), L('Автоматизация рутины'), L('Нейросети для контента')]),
    M('mb6', 'Финансы', [L('Учёт расходов руководителя'), L('Платёжный календарь', { materials: [MATERIALS.sheet('Платёжный календарь')] }), L('Отчёт для собственника')]),
    M('mb7', 'Встречи и календарь', [L('Google Calendar на максимум'), L('Организация встреч и Zoom'), L('Организация поездок')]),
    M('mb8', 'Research', [L('Поиск информации и подрядчиков'), L('Анализ конкурентов'), L('SWOT и презентации')]),
    M('mb9', 'Personal Brand', [L('Распаковка личности'), L('Профиль и портфолио ассистента'), L('Как продать себя на собеседовании')]),
    M('mb10', 'Практика / трудоустройство', [L('Резюме, которое читают', { assignment: 'Загрузите ссылку на своё резюме BOSS VISION для разбора.' }), L('Тестовое задание от работодателя'), L('Первые 30 дней на работе')]),
  ],
}

const salesboss: Course = {
  id: 'c_sales',
  title: 'Sales Boss',
  subtitle: 'Профессия менеджера по продажам',
  description: 'Продажи, которые работают в Казахстане: WhatsApp, Instagram, звонки. Скрипты, работа с возражениями, CRM и сертификат.',
  teacher: { name: 'Айгерим Амантурқызы', title: 'РОП, тренер по продажам' },
  audience: 'all',
  category: 'Продажи',
  price: 120000,
  durationWeeks: 6,
  cover: 'linear-gradient(135deg,#2b2320 0%,#7a4f3a 55%,#e2b48c 100%)',
  features: ['8 модулей', 'Скрипты и таблицы', 'Разбор звонков', 'Сертификат BOSS VISION'],
  certificate: true,
  published: true,
  comingSoon: false,
  createdAt: '2026-06-01T00:00:00.000Z',
  modules: [
    M('sb1', 'Профессия продавца', [L('Кто такой менеджер продаж', { isFree: true }), L('Психология клиента', { isFree: true })]),
    M('sb2', 'Этапы продажи', [L('Установление контакта'), L('Выявление потребностей'), L('Презентация')]),
    M('sb3', 'Возражения', [L('Работа с «дорого»', { assignment: 'Напишите 3 ответа на «дорого» по технике из урока.' }), L('«Я подумаю» и «потом»')]),
    M('sb4', 'Каналы продаж', [L('Продажи в WhatsApp', { materials: [MATERIALS.doc('Скрипт WhatsApp')] }), L('Instagram Direct'), L('Холодные звонки')]),
    M('sb5', 'Воронка и CRM', [L('Воронка продаж'), L('CRM-дисциплина', { materials: [MATERIALS.sheet('Таблица воронки')] })]),
    M('sb6', 'Повторные продажи', [L('Допродажи и LTV'), L('Отзывы и рекомендации')]),
    M('sb7', 'Переговоры', [L('Подготовка к переговорам'), L('Сложные клиенты')]),
    M('sb8', 'Практика', [L('Разбор реальных звонков', { assignment: 'Запишите звонок и пришлите расшифровку куратору.' })]),
  ],
}

const start: Course = {
  id: 'c_start',
  title: 'Старт карьеры',
  subtitle: 'Резюме, отклик и собеседование',
  description: 'Бесплатный мини-курс: как составить резюме без опыта, откликаться и пройти собеседование.',
  teacher: { name: 'Команда BOSS VISION', title: 'Карьерные консультанты' },
  audience: 'candidate',
  category: 'Карьера',
  price: 0,
  durationWeeks: 1,
  cover: 'linear-gradient(135deg,#1f2a2a 0%,#3f6b5c 60%,#b9d3c4 100%)',
  features: ['4 урока', 'Шаблон резюме', 'Сертификат'],
  certificate: true,
  published: true,
  comingSoon: false,
  createdAt: '2026-04-01T00:00:00.000Z',
  modules: [M('st1', 'Старт', [L('Резюме без опыта', { isFree: true }), L('Как откликаться', { isFree: true }), L('Собеседование', { isFree: true }), L('Переговоры о зарплате', { isFree: true })])],
}

const soon = (id: string, title: string, subtitle: string, cover: string): Course => ({
  id,
  title,
  subtitle,
  description: 'Курс в разработке. Оставьте заявку — сообщим о старте первыми.',
  teacher: { name: 'BOSS VISION', title: 'Academy' },
  audience: 'all',
  category: 'Скоро',
  price: 0,
  durationWeeks: 6,
  cover,
  features: [],
  certificate: true,
  published: true,
  comingSoon: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  modules: [],
})

export const SEED_COURSES: Course[] = [
  miniboss,
  salesboss,
  start,
  soon('c_hr', 'HR Boss', 'HR-менеджер', 'linear-gradient(135deg,#2a2a2a,#6f6259,#cdb9a5)'),
  soon('c_marketing', 'Marketing Boss', 'Маркетолог', 'linear-gradient(135deg,#2c2433,#6e5a7c,#d5c3dd)'),
  soon('c_project', 'Project Boss', 'Проектный менеджер', 'linear-gradient(135deg,#1f2733,#4b6178,#bfcbd8)'),
  soon('c_ai', 'AI Boss', 'AI-ассистент бизнеса', 'linear-gradient(135deg,#1d2620,#4a6b57,#c7dccd)'),
]

export const lessonIds = (c: Course) => c.modules.flatMap((m) => m.lessons.map((l) => l.id))
