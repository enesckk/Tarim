import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { homePathForRoles, isProducer, isStaff } from "./auth/roles";
import { PwaManager } from "./pwa/PwaManager";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AppLayout = lazy(() =>
  import("./layout/AppLayout").then((m) => ({ default: m.AppLayout })),
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const ProducersPage = lazy(() =>
  import("./pages/ProducersPage").then((m) => ({ default: m.ProducersPage })),
);
const OfficersPage = lazy(() =>
  import("./pages/OfficersPage").then((m) => ({ default: m.OfficersPage })),
);
const LandsPage = lazy(() =>
  import("./pages/LandsPage").then((m) => ({ default: m.LandsPage })),
);
const LandDetailPage = lazy(() =>
  import("./pages/LandDetailPage").then((m) => ({ default: m.LandDetailPage })),
);
const SeasonsPage = lazy(() =>
  import("./pages/SeasonsPage").then((m) => ({ default: m.SeasonsPage })),
);
const WorkflowsPage = lazy(() =>
  import("./pages/WorkflowsPage").then((m) => ({ default: m.WorkflowsPage })),
);
const TasksPage = lazy(() =>
  import("./pages/TasksPage").then((m) => ({ default: m.TasksPage })),
);
const MessagesPage = lazy(() =>
  import("./pages/MessagesPage").then((m) => ({ default: m.MessagesPage })),
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const InspectionsPage = lazy(() =>
  import("./pages/InspectionsPage").then((m) => ({
    default: m.InspectionsPage,
  })),
);
const HarvestPage = lazy(() =>
  import("./pages/HarvestPage").then((m) => ({ default: m.HarvestPage })),
);
const NotificationsPage = lazy(() =>
  import("./pages/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  })),
);
const ReportsPage = lazy(() =>
  import("./pages/ReportsPage").then((m) => ({ default: m.ReportsPage })),
);
const ApprovalsPage = lazy(() =>
  import("./pages/ApprovalsPage").then((m) => ({ default: m.ApprovalsPage })),
);
const TarimAiPage = lazy(() =>
  import("./pages/TarimAiPage").then((m) => ({ default: m.TarimAiPage })),
);
const CropDetailPage = lazy(() => import("./pages/CropDetailPage"));
const CropAdminPage = lazy(() => import("./pages/CropAdminPage"));
const CropDecisionMatrixAdminPage = lazy(() =>
  import("./pages/CropDecisionMatrixAdminPage").then((m) => ({
    default: m.CropDecisionMatrixAdminPage,
  })),
);
const ProducerApp = lazy(() =>
  import("./producer/ProducerApp").then((m) => ({ default: m.ProducerApp })),
);

function Protected({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (!isStaff(user.roles)) return <Navigate to="/login" replace />;
  return children;
}

function ProducerProtected({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (!isProducer(user.roles))
    return <Navigate to={homePathForRoles(user.roles)} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense
        fallback={
          <div className="route-loading" role="status">
            Yükleniyor…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/producer/*"
            element={
              <ProducerProtected>
                <ProducerApp />
              </ProducerProtected>
            }
          />
          <Route
            path="/app/*"
            element={
              <Protected>
                <AppLayout />
              </Protected>
            }
          >
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
            <Route
              path="crop-decision-matrix"
              element={<CropDecisionMatrixAdminPage />}
            />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<CatchAll />} />
        </Routes>
      </Suspense>
      <PwaManager />
      <Toaster />
    </AuthProvider>
  );
}

function CatchAll() {
  const { token, user } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  return <Navigate to={homePathForRoles(user.roles)} replace />;
}
