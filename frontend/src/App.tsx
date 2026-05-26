import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { appRoutes, appTabs } from './router/routes';
import './App.css';

export default function App() {
  return <><nav className="tabs">{appTabs.map(({ label, path }) => <NavLink key={path} to={path} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>{label}</NavLink>)}</nav><main><Routes><Route path="/" element={<Navigate to="/dashboard" replace />} />{appRoutes.map((route) => <Route key={route.path} path={route.path} element={route.element} />)}</Routes></main></>;
}
