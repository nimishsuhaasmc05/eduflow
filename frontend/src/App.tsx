import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AffectiveProvider } from './context/AffectiveContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { LandingPage } from './pages/LandingPage';

// ... remaining imports ...
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUserManagement } from './pages/AdminUserManagement';
import { AdminTeacherManagement } from './pages/AdminTeacherManagement';
import { AdminStudentManagement } from './pages/AdminStudentManagement';
import { AdminCourseManagement } from './pages/AdminCourseManagement';
import { AdminLiveClasses } from './pages/AdminLiveClasses';
import { AdminSystemMonitoring } from './pages/AdminSystemMonitoring';
import { AdminAuditLogs } from './pages/AdminAuditLogs';
import { AdminSettings } from './pages/AdminSettings';
import { CourseView } from './pages/CourseView';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { ExploreCoursesPage } from './pages/ExploreCoursesPage';
import { DigitalLibraryPage } from './pages/DigitalLibraryPage';
import { LiveClassesPage } from './pages/LiveClassesPage';
import { LiveClassLobby } from './pages/LiveClassLobby';
import { LiveClassroomView } from './pages/LiveClassroomView';
import { VerifyEmailModal } from './components/common/VerifyEmailModal';
import { ThemeProvider } from './context/ThemeContext';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isEmailVerified, loading, logout, setIsEmailVerified } = useAuth();
  const location = useLocation();
  const isCoursePage = location.pathname.startsWith('/course/');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080B0F] flex items-center justify-center text-[#0EA5E9] dark:text-[#22D3EE] font-mono text-xs font-bold">
        LOADING EDU-FLOW SYSTEMS...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080B0F] text-[#0F172A] dark:text-[#F1F5F9] flex flex-col transition-colors duration-150 font-sans">
      {!isEmailVerified && (
        <VerifyEmailModal
          email={user.email}
          onVerified={() => setIsEmailVerified(true)}
          onLogout={logout}
        />
      )}
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        {!isCoursePage && <Sidebar />}
        <main className={isCoursePage ? "flex-1 min-w-0 w-full overflow-hidden" : "flex-1 p-6 max-w-7xl mx-auto w-full"}>
          {children}
        </main>
      </div>
    </div>
  );
};

const AdminRoleGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const DashboardSelector: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') return <AdminDashboard />;
  if (user?.role === 'teacher') return <TeacherDashboard />;
  return <StudentDashboard />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AffectiveProvider>
          <Router>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected SaaS App Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedLayout>
                  <DashboardSelector />
                </ProtectedLayout>
              }
            />

            {/* Dedicated Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedLayout>
                  <AdminRoleGuard>
                    <AdminDashboard />
                  </AdminRoleGuard>
                </ProtectedLayout>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedLayout>
                  <AdminRoleGuard>
                    <AdminUserManagement />
                  </AdminRoleGuard>
                </ProtectedLayout>
              }
            />
            <Route
              path="/admin/teachers"
              element={
                <ProtectedLayout>
                  <AdminRoleGuard>
                    <AdminTeacherManagement />
                  </AdminRoleGuard>
                </ProtectedLayout>
              }
            />
            <Route
              path="/admin/students"
              element={
                <ProtectedLayout>
                  <AdminRoleGuard>
                    <AdminStudentManagement />
                  </AdminRoleGuard>
                </ProtectedLayout>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <ProtectedLayout>
                  <AdminRoleGuard>
                    <AdminCourseManagement />
                  </AdminRoleGuard>
                </ProtectedLayout>
              }
            />
            <Route
              path="/admin/live-classes"
              element={
                <ProtectedLayout>
                  <AdminRoleGuard>
                    <AdminLiveClasses />
                  </AdminRoleGuard>
                </ProtectedLayout>
              }
            />
            <Route
              path="/admin/system"
              element={
                <ProtectedLayout>
                  <AdminRoleGuard>
                    <AdminSystemMonitoring />
                  </AdminRoleGuard>
                </ProtectedLayout>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedLayout>
                  <AdminRoleGuard>
                    <AdminAuditLogs />
                  </AdminRoleGuard>
                </ProtectedLayout>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedLayout>
                  <AdminRoleGuard>
                    <AdminSettings />
                  </AdminRoleGuard>
                </ProtectedLayout>
              }
            />
            <Route
              path="/explore"
              element={
                <ProtectedLayout>
                  <ExploreCoursesPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/library"
              element={
                <ProtectedLayout>
                  <DigitalLibraryPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/course/:id"
              element={
                <ProtectedLayout>
                  <CourseView />
                </ProtectedLayout>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedLayout>
                  <AnalyticsPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedLayout>
                  <LeaderboardPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedLayout>
                  <ProfilePage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/live"
              element={
                <ProtectedLayout>
                  <LiveClassesPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/live/:joinToken"
              element={
                <ProtectedLayout>
                  <LiveClassLobby />
                </ProtectedLayout>
              }
            />
            <Route
              path="/live-class/:joinToken"
              element={
                <ProtectedLayout>
                  <LiveClassLobby />
                </ProtectedLayout>
              }
            />
            <Route
              path="/live-classes/join/:joinToken"
              element={
                <ProtectedLayout>
                  <LiveClassLobby />
                </ProtectedLayout>
              }
            />
            <Route
              path="/live/:joinToken"
              element={
                <ProtectedLayout>
                  <LiveClassroomView />
                </ProtectedLayout>
              }
            />
            <Route
              path="/live/:joinToken/room"
              element={
                <ProtectedLayout>
                  <LiveClassroomView />
                </ProtectedLayout>
              }
            />
            <Route
              path="/live-class/:joinToken/room"
              element={
                <ProtectedLayout>
                  <LiveClassroomView />
                </ProtectedLayout>
              }
            />
            <Route
              path="/online-class/:joinToken/room"
              element={
                <ProtectedLayout>
                  <LiveClassroomView />
                </ProtectedLayout>
              }
            />
            <Route
              path="/online-class/:joinToken"
              element={
                <ProtectedLayout>
                  <LiveClassroomView />
                </ProtectedLayout>
              }
            />
            <Route
              path="/online-classes/:joinToken"
              element={
                <ProtectedLayout>
                  <LiveClassroomView />
                </ProtectedLayout>
              }
            />

            {/* Fallback Root */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AffectiveProvider>
    </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
