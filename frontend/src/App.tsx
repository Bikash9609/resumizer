import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import ResumeEditor from './pages/ResumeEditor';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/editor/:id" element={<ResumeEditor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
