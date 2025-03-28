import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EmployeePanel from './components/EmployeePanel';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import Settings from './components/Settings';
import { SettingsProvider } from './contexts/SettingsContext';

function App() {
  return (
    <SettingsProvider>
      <Router>
        <Settings />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/employee" element={<EmployeePanel />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </Router>
    </SettingsProvider>
  );
}

export default App;