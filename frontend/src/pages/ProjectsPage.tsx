import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { isQueryError } from '../apiClient';
import { useAnnouncement } from '../announcementContext';
import { QueryState } from '../components/QueryState';
import { SectionTabs } from '../components/SectionTabs';
import { TASK_VIEW_TABS } from '../router/routes';
import { ProjectCreateForm, type ProjectCreateFormHandle } from '../components/projects/ProjectCreateForm';
import { projectStatusVariant } from '../components/projects/projectStyleUtils';
import type { ProjectRecord } from '../components/projects/projectTypes';
import { formatEnumLabel } from '../lib/enumLabels';
import { useProjectMutations, useProjectsQuery } from '../hooks/useApiQueries';
import { Badge, Button, Card, Drawer, EmptyState } from '../components/ui';
import { FolderKanban, Plus } from '../components/ui/icons';

const formatDate = (value?: string) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : undefined);

export function ProjectsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { announce } = useAnnouncement();
  const createFormRef = useRef<ProjectCreateFormHandle>(null);

  const projectsQuery = useProjectsQuery();
  const { createProject } = useProjectMutations();

  const projects = useMemo<ProjectRecord[]>(() => (Array.isArray(projectsQuery.data?.data) ? (projectsQuery.data.data as ProjectRecord[]) : []), [projectsQuery.data]);
  const sortedProjects = useMemo(() => [...projects].sort((a, b) => a.name.localeCompare(b.name)), [projects]);

  const isLoading = projectsQuery.isLoading;
  const hasError = isQueryError(projectsQuery.data);

  const showCreatePanel = () => {
    setCreateOpen(true);
    window.requestAnimationFrame(() => createFormRef.current?.focusName());
  };

  const closeCreatePanel = () => setCreateOpen(false);

  const submitCreate = (payload: Parameters<typeof createProject.mutate>[0], onSuccess: () => void) => {
    createProject.mutate(payload, {
      onSuccess: (result) => {
        announce(result.ok ? 'Project created successfully.' : (result.error?.message ?? 'Project creation failed.'));
        if (result.ok) { onSuccess(); closeCreatePanel(); }
      },
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3" aria-label="Project controls">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-fg">Tasks</h2>
          <p className="mt-1 text-sm text-fg-muted">Group related tasks under a project with a target date and milestones.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SectionTabs items={TASK_VIEW_TABS} ariaLabel="Task view" />
          <Button variant="primary" onClick={showCreatePanel} disabled={createProject.isPending}>
            <Plus className="h-4 w-4" aria-hidden />
            New project
          </Button>
        </div>
      </header>

      <QueryState isLoading={isLoading} isError={hasError} isEmpty={false} />

      {!isLoading && !hasError && sortedProjects.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project to group related tasks with a shared target date and milestones."
          action={<Button variant="primary" onClick={showCreatePanel}><Plus className="h-4 w-4" aria-hidden />New project</Button>}
        />
      )}

      {sortedProjects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedProjects.map((project) => (
            <Link key={project.id} to={`/tasks/projects/${project.id}`} className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand/50">
              <Card className="flex h-full flex-col gap-2 transition-shadow duration-(--duration-fast) hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate text-sm font-semibold text-fg">{project.name}</h3>
                  <Badge variant={projectStatusVariant(project.status)}>{formatEnumLabel(project.status)}</Badge>
                </div>
                {project.description && <p className="line-clamp-2 text-sm text-fg-muted">{project.description}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs text-fg-subtle">
                  {project.area && <Badge variant="outline">{formatEnumLabel(project.area)}</Badge>}
                  {project.targetDate && <span>Target: {formatDate(project.targetDate)}</span>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Drawer
        open={createOpen}
        onOpenChange={(open) => { if (!open) closeCreatePanel(); }}
        title="Create project"
        description="Group related tasks with a shared target date and milestones."
      >
        <ProjectCreateForm
          ref={createFormRef}
          busy={createProject.isPending}
          isSubmitting={createProject.isPending}
          onCancel={closeCreatePanel}
          onSubmit={submitCreate}
          onInvalidName={() => setCreateOpen(true)}
        />
      </Drawer>
    </div>
  );
}
