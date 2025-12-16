import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TestProvider } from './context/TestContext';
import MobileBlocker from './components/MobileBlocker';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Test from './pages/Test';
import Admin from './pages/Admin';
import Analytics from './pages/Analytics';
import Leaderboard from './pages/Leaderboard';

export default function App() {
  return (
    <MobileBlocker>
      <AuthProvider>
        <TestProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/test" element={<Test />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </TestProvider>
      </AuthProvider>
    </MobileBlocker>
  );
}
