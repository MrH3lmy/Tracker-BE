import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { apiJson, type ApiCallResult } from './apiClient';
import { RequestInspector } from './RequestInspector';
import './App.css';

function DashboardPage() {
  const [result, setResult] = useState<ApiCallResult<unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const checkApi = async () => {
    setLoading(true);
    try {
      const response = await apiJson<unknown>('GET', '/api/v1/dashboard');
      setResult(response);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Dashboard</h2>
      <button onClick={checkApi} disabled={loading}>{loading ? 'Checking...' : 'Check API'}</button>
      <RequestInspector result={result} />
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h2>{title}</h2>
      <p>Scaffolded page.</p>
    </div>
  );
}

const tabs = [
  ['Dashboard', '/dashboard'],
  ['Tasks', '/tasks'],
  ['Planning', '/planning'],
  ['Matrix', '/matrix'],
  ['Calendar', '/calendar'],
  ['Settings', '/settings'],
  ['Import', '/import'],
  ['Error Playground', '/errors']
] as const;

export default function App() {
  return (
    <>
      <nav className="tabs">
        {tabs.map(([label, path]) => (
          <NavLink key={path} to={path} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
            {label}
          </NavLink>
        ))}
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tasks" element={<PlaceholderPage title="Tasks" />} />
          <Route path="/planning" element={<PlaceholderPage title="Planning" />} />
          <Route path="/matrix" element={<PlaceholderPage title="Matrix" />} />
          <Route path="/calendar" element={<PlaceholderPage title="Calendar" />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
          <Route path="/import" element={<PlaceholderPage title="Import" />} />
          <Route path="/errors" element={<PlaceholderPage title="Error Playground" />} />
        </Routes>
      </main>
    </>
  );
}
