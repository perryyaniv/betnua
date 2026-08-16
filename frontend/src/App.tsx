import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Teachers from './pages/Teachers';
import TeacherDetail from './pages/TeacherDetail';
import Courses from './pages/Courses';
import Troupes from './pages/Troupes';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Leads from './pages/Leads';
import Students from './pages/Students';
import DropoutReport from './pages/DropoutReport';
import AuditLog from './pages/AuditLog';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import Spinner from './components/ui/Spinner';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <Spinner />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (user.forcePasswordChange) return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}

function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="branches" element={<Branches />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="teachers/:id" element={<TeacherDetail />} />
          <Route path="courses" element={<Courses />} />
          <Route path="troupes" element={<Troupes />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<EventDetail />} />
          <Route path="leads" element={<Leads />} />
          <Route path="students" element={<Students />} />
          <Route path="reports/dropouts" element={<DropoutReport />} />
          <Route
            path="audit-log"
            element={
              <RequireRole roles={['admin']}>
                <AuditLog />
              </RequireRole>
            }
          />
          <Route
            path="users"
            element={
              <RequireRole roles={['admin']}>
                <UserManagement />
              </RequireRole>
            }
          />
          <Route
            path="settings"
            element={
              <RequireRole roles={['admin']}>
                <Settings />
              </RequireRole>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
