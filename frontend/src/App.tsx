import {
  AlertTriangle,
  CalendarDays,
  Grid2X2,
  Import,
  LayoutDashboard,
  ListTodo,
  Map,
  Settings
} from "lucide-react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { EndpointPage, type EndpointDefinition } from "./pages/EndpointPage";

const routeGroups: Array<{
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  endpoints: EndpointDefinition[];
}> = [
  {
    path: "/tasks",
    label: "Tasks",
    icon: ListTodo,
    endpoints: [
      { method: "GET", path: "/api/v1/tasks", label: "List tasks" },
      { method: "GET", path: "/api/v1/tasks/archive", label: "Archive" },
      { method: "GET", path: "/api/v1/tasks/duplicates", label: "Duplicates" },
      {
        method: "POST",
        path: "/api/v1/tasks",
        label: "Create task",
        body: {
          title: "Prepare sprint plan",
          dueDate: "2026-06-01",
          effort: "MEDIUM"
        }
      }
    ]
  },
  {
    path: "/planning",
    label: "Planning",
    icon: Map,
    endpoints: [
      { method: "GET", path: "/api/v1/planning/today", label: "Today" },
      { method: "GET", path: "/api/v1/planning/weekly", label: "Weekly" }
    ]
  },
  {
    path: "/matrix",
    label: "Matrix",
    icon: Grid2X2,
    endpoints: [{ method: "GET", path: "/api/v1/matrix", label: "Priority matrix" }]
  },
  {
    path: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/calendar/month?year=2026&month=5",
        label: "Month"
      },
      { method: "GET", path: "/api/v1/calendar/export.ics", label: "Export ICS" }
    ]
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
    endpoints: [
      { method: "GET", path: "/api/v1/settings", label: "Read settings" },
      {
        method: "PUT",
        path: "/api/v1/settings",
        label: "Save settings",
        body: { timezone: "UTC" }
      }
    ]
  },
  {
    path: "/import",
    label: "Import",
    icon: Import,
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/import/tasks",
        label: "Import tasks",
        body: {
          csv: "title,description,dueDate,status,important,area,effort\nExample task,,2026-06-01,NOT_STARTED,true,WORK,LOW"
        }
      },
      {
        method: "POST",
        path: "/api/v1/import/csv",
        label: "Import CSV",
        body: {
          csv: "title,description,dueDate,status,important,area,effort\nExample task,,2026-06-01,NOT_STARTED,true,WORK,LOW"
        }
      }
    ]
  },
  {
    path: "/errors",
    label: "Error Playground",
    icon: AlertTriangle,
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/tasks",
        label: "Missing title",
        body: { dueDate: "2026-06-01" }
      },
      {
        method: "PATCH",
        path: "/api/v1/tasks/1/status?status=BAD_VALUE",
        label: "Invalid status"
      },
      { method: "GET", path: "/api/v1/tasks/999999999", label: "Missing task" }
    ]
  }
];

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ...routeGroups.map(({ path, label, icon }) => ({ path, label, icon }))
];

export function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">T</span>
          <div>
            <strong>Tracker FE</strong>
            <span>API workbench</span>
          </div>
        </div>
        <nav className="nav-tabs" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink key={item.path} to={item.path} className="nav-tab">
                <Icon size={16} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          {routeGroups.map((group) => (
            <Route
              key={group.path}
              path={group.path}
              element={<EndpointPage title={group.label} endpoints={group.endpoints} />}
            />
          ))}
        </Routes>
      </main>
    </div>
  );
}
