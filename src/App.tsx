import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotesPage } from './pages/NotesPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { AssignmentDetailPage } from './pages/AssignmentDetailPage';
import { AssignmentReviewPage } from './pages/AssignmentReviewPage';
import { NoticesPage } from './pages/NoticesPage';
import { BatchManagementPage } from './pages/BatchManagementPage';
import { LecturesPage } from './pages/LecturesPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes — no AppShell */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected routes — wrapped in AppShell */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']} />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/assignments" element={<AssignmentsPage />} />
              <Route path="/assignments/:id" element={<AssignmentDetailPage />} />
              <Route path="/notices" element={<NoticesPage />} />
              <Route path="/lectures" element={<LecturesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Teacher/Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher']} />}>
            <Route element={<AppShell />}>
              <Route path="/batches" element={<Placeholder name="Batch List" />} />
              <Route path="/assignments/:id/review/:submissionId" element={<AssignmentReviewPage />} />
            </Route>
          </Route>

          {/* Admin-only routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AppShell />}>
              <Route path="/batch-management" element={<BatchManagementPage />} />
            </Route>
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

/** Temporary placeholder for future pages */
function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="font-heading text-xl text-white/60 mb-2">{name}</h2>
        <p className="text-sm text-white/30">Coming soon in the next step</p>
      </div>
    </div>
  );
}

export default App;
