import type { ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { Layout, homePath } from './components/Layout'
import { Logo } from './components/Logo'
import { isStaff, StoreProvider, useStore } from './data/store'
import type { Role } from './types'
import Academy, { CertificateView, Certificates, CourseDetail } from './pages/academy/Academy'
import LessonPage from './pages/academy/LessonPage'
import AdminShell from './pages/admin/AdminShell'
import { OnboardingCandidate, RegisterEmployer } from './pages/auth/Onboarding'
import Splash, { Login } from './pages/auth/Splash'
import Applications from './pages/candidate/Applications'
import CandidateHome from './pages/candidate/Home'
import Jobs, { Saved } from './pages/candidate/Jobs'
import ResumeBuilder from './pages/candidate/ResumeBuilder'
import Tests, { TestRun } from './pages/candidate/Tests'
import { Advice, ArticleView, News } from './pages/common/Articles'
import Chats from './pages/common/Chats'
import JobDetail from './pages/common/JobDetail'
import Profile from './pages/common/Profile'
import ResumeView from './pages/common/ResumeView'
import Settings, { Notifications } from './pages/common/Settings'
import EmployerDashboard from './pages/employer/Dashboard'
import { AiMatch, Applicants, Base, Candidates, Recruitment, Subscription } from './pages/employer/Hiring'
import EmployerVacancies from './pages/employer/Vacancies'
import VacancyWizard from './pages/employer/VacancyWizard'

/** Пускает только вошедших; roles — кому доступна страница. Админ/куратор на общих страницах видят тонкую рамку «← В админку». */
function Guard({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { me } = useStore()
  if (!me) return <Navigate to="/" replace />
  if (roles && !roles.includes(me.role)) return <Navigate to={homePath(me.role)} replace />
  if (isStaff(me)) return <StaffFrame>{children}</StaffFrame>
  return <Layout>{children}</Layout>
}

function StaffFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-xl lg:px-10">
        <Logo size="sm" />
        <Link to="/admin" className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-on-accent">← В админку</Link>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-5 lg:px-10">{children}</main>
    </div>
  )
}

function Public({ children }: { children: ReactNode }) {
  const { me } = useStore()
  if (!me) return <>{children}</>
  // ТЗ п.4/9: после регистрации кандидат сразу проходит обязательный MBTI
  if (me.role === 'candidate' && !me.testResults.mbti) return <Navigate to="/tests/mbti?first=1" replace />
  return <Navigate to={homePath(me.role)} replace />
}

const C: Role[] = ['candidate']
const E: Role[] = ['employer']
const STAFF: Role[] = ['admin', 'curator']

const routes: [string, ReactNode, Role[]?][] = [
  // кандидат
  ['/home', <CandidateHome />, C],
  ['/tests', <Tests />, C],
  ['/tests/:id', <TestRun />, C],
  ['/resume', <ResumeBuilder />, C],
  ['/applications', <Applications />, C],
  ['/saved', <Saved />, C],
  ['/certificates', <Certificates />, C],
  // предприниматель
  ['/employer', <EmployerDashboard />, E],
  ['/employer/vacancies', <EmployerVacancies />, E],
  ['/employer/vacancies/new', <VacancyWizard />, E],
  ['/employer/vacancies/:id/edit', <VacancyWizard />, E],
  ['/employer/applicants', <Applicants />, E],
  ['/employer/ai-match', <AiMatch />, E],
  ['/employer/base', <Base />, E],
  ['/employer/candidates', <Candidates />, E],
  ['/employer/recruitment', <Recruitment />, E],
  ['/employer/subscription', <Subscription />, E],
  // общее
  ['/jobs', <Jobs />],
  ['/jobs/:id', <JobDetail />],
  ['/academy', <Academy />],
  ['/academy/:courseId', <CourseDetail />],
  ['/academy/:courseId/lesson/:lessonId', <LessonPage />],
  ['/certificates/:id', <CertificateView />],
  ['/resumes/:id', <ResumeView />],
  ['/chats', <Chats />],
  ['/chats/:threadId', <Chats />],
  ['/news', <News />],
  ['/advice', <Advice />],
  ['/articles/:id', <ArticleView />],
  ['/profile', <Profile />, [...C, ...E]],
  ['/settings', <Settings />],
  ['/notifications', <Notifications />],
]

function AdminGuard() {
  const { me } = useStore()
  if (!me) return <Navigate to="/" replace />
  if (!STAFF.includes(me.role)) return <Navigate to={homePath(me.role)} replace />
  return <AdminShell />
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Public><Splash /></Public>} />
          <Route path="/login" element={<Public><Login /></Public>} />
          <Route path="/start/candidate" element={<Public><OnboardingCandidate /></Public>} />
          <Route path="/start/employer" element={<Public><RegisterEmployer /></Public>} />
          <Route path="/admin" element={<AdminGuard />} />
          {routes.map(([path, el, roles]) => (
            <Route key={path} path={path} element={<Guard roles={roles}>{el}</Guard>} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
