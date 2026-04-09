import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UploadDocument from './pages/UploadDocument';
import AddSigners from './pages/AddSigners';
import DocumentList from './pages/DocumentList';
import DocumentDetails from './pages/DocumentDetails';
import AuditTrail from './pages/AuditTrail';
import Companies from './pages/Companies';
import UserManagement from './pages/UserManagement';
import SignerView from './pages/SignerView';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <PrivateRoute>
                <UploadDocument />
              </PrivateRoute>
            }
          />
          <Route
            path="/add-signers"
            element={
              <PrivateRoute>
                <AddSigners />
              </PrivateRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <PrivateRoute>
                <DocumentList />
              </PrivateRoute>
            }
          />
          <Route
            path="/documents/:id"
            element={
              <PrivateRoute>
                <DocumentDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/audit-trail"
            element={
              <PrivateRoute>
                <AuditTrail />
              </PrivateRoute>
            }
          />
          <Route
            path="/companies"
            element={
              <PrivateRoute>
                <Companies />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute>
                <UserManagement />
              </PrivateRoute>
            }
          />
          <Route path="/sign/:token" element={<SignerView />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
