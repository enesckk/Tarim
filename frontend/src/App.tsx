import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import type { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { homePathForRoles, isStaff } from './auth/roles'
import { AppLayout } from './layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProducersPage } from './pages/ProducersPage'
import { OfficersPage } from './pages/OfficersPage'
import { LandsPage } from './pages/LandsPage'
import { LandDetailPage } from './pages/LandDetailPage'
import { SeasonsPage } from './pages/SeasonsPage'
import { WorkflowsPage } from './pages/WorkflowsPage'
import { TasksPage } from './pages/TasksPage'
import { MessagesPage } from './pages/MessagesPage'
import { ProfilePage } from './pages/ProfilePage'
import { InspectionsPage } from './pages/InspectionsPage'
import { HarvestPage } from './pages/HarvestPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ReportsPage } from './pages/ReportsPage'
import { ApprovalsPage } from './pages/ApprovalsPage'
import { TarimAiPage } from './pages/TarimAiPage'
import CropDetailPage from './pages/CropDetailPage'
import CropAdminPage from './pages/CropAdminPage'
import { CropDecisionMatrixAdminPage } from './pages/CropDecisionMatrixAdminPage'

function Protected({ children }: { children: ReactNode }) {
  const { token, user } = useAuth()
  if (!token || !user) return <Navigate to="/login" replace />
  if (!isStaff(user.roles)) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={
          <LandingPage />
        } />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app/*" element={
          <Protected>
            <AppLayout />
          </Protected>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="producers" element={<ProducersPage />} />
          <Route path="producers/:producerId" element={<ProducersPage />} />
          <Route path="officers" element={<OfficersPage />} />
          <Route path="officers/:officerId" element={<OfficersPage />} />
          <Route path="uzmanlar" element={<OfficersPage />} />
          <Route path="uzmanlar/:officerId" element={<OfficersPage />} />
          <Route path="lands" element={<LandsPage />} />
          <Route path="lands/:landId" element={<LandDetailPage />} />
          <Route path="seasons" element={<SeasonsPage />} />
          <Route path="workflows" element={<WorkflowsPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="inspections" element={<InspectionsPage />} />
          <Route path="harvest" element={<HarvestPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="tarim-ai" element={<TarimAiPage />} />
          <Route path="crop-knowledge/:cropId" element={<CropDetailPage />} />
          <Route path="crop-admin" element={<CropAdminPage />} />
          <Route path="crop-decision-matrix" element={<CropDecisionMatrixAdminPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<CatchAll />} />
      </Routes>
      <Toaster />
    </AuthProvider>
  )
}

function CatchAll() {
  const { token, user } = useAuth()
  if (!token || !user) return <Navigate to="/login" replace />
  return <Navigate to={homePathForRoles(user.roles)} replace />
}
