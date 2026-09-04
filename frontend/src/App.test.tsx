import { render, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { appTabs, detailRoutes, legacyRedirects, primaryRoutes, sectionRoutes } from './router/routes';

const AUTH_USER = { id: 1, email: 'test@example.com', displayName: 'Test User', tier: 'FREE', role: 'USER' };

/**
 * The shell reads matchMedia to decide sidebar density. jsdom ships a stub that
 * always reports `false`, which would pin every test to the rail; this lets a
 * test choose the width it is exercising.
 */
function setViewport(matchesFullSidebar: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('1024') ? matchesFullSidebar : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

async function renderAppAt(path: string, { fullSidebar = true } = {}) {
  setViewport(fullSidebar);
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/refresh')) {
        return Promise.resolve(
          new Response(JSON.stringify({ accessToken: 'stub-access-token', user: AUTH_USER }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return Promise.reject(new Error('network disabled in tests'));
    }),
  );

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitForElementToBeRemoved(() => screen.queryByText('Restoring your session...'));
  return result;
}

/** The shell's primary navigation is split into labelled groups, not one flat list. */
function navFor(label: 'Workspaces' | 'Manage') {
  return screen.getByRole('navigation', { name: label });
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('shell navigation architecture', () => {
  it('separates workspace destinations from management tools (nav-hierarchy)', async () => {
    await renderAppAt('/today');

    const workspaces = navFor('Workspaces');
    for (const label of ['Today', 'Tasks', 'Habits', 'Notes', 'Calendar', 'Insights']) {
      expect(within(workspaces).getByRole('link', { name: label })).toBeInTheDocument();
    }

    const manage = navFor('Manage');
    for (const label of ['Search', 'Settings', 'Import']) {
      expect(within(manage).getByRole('link', { name: label })).toBeInTheDocument();
    }

    // The separation must be real: a workspace must not appear under Manage.
    expect(within(manage).queryByRole('link', { name: 'Tasks' })).toBeNull();
    expect(within(workspaces).queryByRole('link', { name: 'Settings' })).toBeNull();
  });

  it('keeps every primary destination reachable from the shell', async () => {
    await renderAppAt('/today');

    for (const { label, path } of appTabs) {
      const link = screen.getAllByRole('link', { name: label })[0];
      expect(link).toHaveAttribute('href', path);
    }
  });

  it('gives every navigation item a visible text label, not an icon alone (nav-label-icon)', async () => {
    await renderAppAt('/today');

    for (const { label } of appTabs) {
      const link = screen.getAllByRole('link', { name: label })[0];
      // A label hidden in an sr-only span would still satisfy the accessible
      // name, so assert the text is actually rendered in the link.
      expect(link).toHaveTextContent(label);
    }
  });
});

describe('active route indication', () => {
  it.each([
    ['/notes', 'Notes', 'Calendar'],
    ['/calendar', 'Calendar', 'Notes'],
    ['/insights', 'Insights', 'Today'],
  ])('marks only the active destination on %s', async (path, active, inactive) => {
    await renderAppAt(path);
    const workspaces = navFor('Workspaces');

    expect(within(workspaces).getByRole('link', { name: active })).toHaveAttribute('aria-current', 'page');
    expect(within(workspaces).getByRole('link', { name: inactive })).not.toHaveAttribute('aria-current');
  });

  it('keeps a section route marked against its parent destination', async () => {
    await renderAppAt('/calendar/week');

    expect(within(navFor('Workspaces')).getByRole('link', { name: 'Calendar' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

describe('breadcrumbs (breadcrumb-web)', () => {
  it('names the current workspace on a top-level route', async () => {
    await renderAppAt('/notes');
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });

    expect(within(crumbs).getByText('Notes')).toHaveAttribute('aria-current', 'page');
  });

  it('shows the section under its workspace on a nested route', async () => {
    await renderAppAt('/tasks/projects');
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });

    // The parent stays a link so it can be navigated back to...
    expect(within(crumbs).getByRole('link', { name: 'Tasks' })).toHaveAttribute('href', '/tasks');
    // ...and the trailing crumb is the current page, so it is not a link.
    expect(within(crumbs).getByText('Projects')).toHaveAttribute('aria-current', 'page');
    expect(within(crumbs).queryByRole('link', { name: 'Projects' })).toBeNull();
  });
});

describe('routes render inside the shell', () => {
  const everyShellRoute = [...primaryRoutes, ...sectionRoutes].map(({ path }) => path);

  it.each(everyShellRoute)('renders %s within the shell chrome', async (path) => {
    await renderAppAt(path);

    expect(screen.getByRole('navigation', { name: 'Workspaces' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders a detail route inside the shell rather than replacing it', async () => {
    const detailPath = detailRoutes.find(({ path }) => path === '/habits/analysis')?.path;
    await renderAppAt(detailPath ?? '/habits/analysis');

    expect(screen.getByRole('navigation', { name: 'Workspaces' })).toBeInTheDocument();
    expect(within(navFor('Workspaces')).getByRole('link', { name: 'Habits' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('legacy redirects still resolve', () => {
  it.each(legacyRedirects.map(({ from, to }) => [from, to]))('%s still lands on %s', async (from, to) => {
    await renderAppAt(from);

    // The redirect target's own primary destination ends up active, which only
    // happens if the redirect actually resolved. <Navigate> redirects on an
    // effect, so this settles a tick after the shell first paints.
    const rootLabel = appTabs.find(({ path }) => to === path || to.startsWith(`${path}/`))?.label;
    expect(rootLabel).toBeDefined();
    await waitFor(() =>
      expect(within(navFor('Workspaces')).getByRole('link', { name: rootLabel! })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
  });

  it('sends the bare root to Today', async () => {
    await renderAppAt('/');

    await waitFor(() =>
      expect(within(navFor('Workspaces')).getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page'),
    );
  });
});

describe('keyboard and screen-reader affordances', () => {
  it('puts a skip link first in the tab order and points it at main', async () => {
    const user = userEvent.setup();
    await renderAppAt('/today');

    await user.tab();
    const skipLink = screen.getByRole('link', { name: 'Skip to content' });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute('href', '#tracker-main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'tracker-main');
  });

  it('exposes a polite live region for route and action announcements', async () => {
    await renderAppAt('/today');

    // Named so it is not confused with the per-page loading/status regions.
    const status = screen.getByRole('status', { name: 'Application announcements' });
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('moves focus to main content after a route change (focus-on-route-change)', async () => {
    const user = userEvent.setup();
    await renderAppAt('/today');

    await user.click(within(navFor('Workspaces')).getByRole('link', { name: 'Notes' }));

    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus());
  });
});

describe('destructive action separation (destructive-nav-separation)', () => {
  it('keeps log out behind the account menu instead of loose in the chrome', async () => {
    const user = userEvent.setup();
    await renderAppAt('/today');

    expect(screen.queryByRole('button', { name: 'Log out' })).toBeNull();

    await user.click(screen.getByRole('button', { name: /Account menu for/ }));

    expect(await screen.findByRole('menuitem', { name: 'Log out' })).toBeInTheDocument();
  });
});

describe('mobile navigation', () => {
  it('exposes exactly one labelled tab bar of five items (bottom-nav-limit)', async () => {
    await renderAppAt('/today', { fullSidebar: false });
    const bar = screen.getByRole('navigation', { name: 'Primary' });

    for (const label of ['Today', 'Tasks', 'Habits', 'Notes']) {
      expect(within(bar).getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(within(bar).getByRole('button', { name: 'More' })).toBeInTheDocument();
    // Four destinations plus More: the cap is five.
    expect(within(bar).getAllByRole('link')).toHaveLength(4);
  });

  it('keeps quick add out of the tab bar (bottom-nav-top-level)', async () => {
    // /notes has no create action of its own, so the shell supplies one.
    await renderAppAt('/notes', { fullSidebar: false });
    const bar = screen.getByRole('navigation', { name: 'Primary' });

    expect(within(bar).queryByRole('button', { name: 'Quick add' })).toBeNull();
    // It is still available, just outside the bar (the FAB, plus the top bar's
    // button at wider widths -- CSS decides which is visible).
    expect(screen.getAllByRole('button', { name: /Quick add/ }).length).toBeGreaterThan(0);
  });

  it('suppresses the shell quick add where the page supplies its own', async () => {
    // Today, Tasks and Habits each render a prominent create action, so the
    // shell stands down rather than putting two primary buttons on one screen.
    await renderAppAt('/today', { fullSidebar: false });

    expect(
      screen.queryAllByRole('button', { name: /Quick add/ }).filter((el) => el.closest('header, nav')),
    ).toHaveLength(0);
  });

  it('reaches destinations that are not on the bar through the More sheet', async () => {
    const user = userEvent.setup();
    await renderAppAt('/today', { fullSidebar: false });

    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('button', { name: 'More' }));

    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/calendar');
    expect(within(sheet).getByRole('link', { name: 'Insights' })).toHaveAttribute('href', '/insights');
    expect(within(sheet).getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(within(sheet).getByRole('link', { name: 'Import' })).toHaveAttribute('href', '/import');
  });

  it('closes the More sheet once a destination is chosen', async () => {
    const user = userEvent.setup();
    await renderAppAt('/today', { fullSidebar: false });

    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('button', { name: 'More' }));
    const sheet = await screen.findByRole('dialog');
    await user.click(within(sheet).getByRole('link', { name: 'Calendar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('is dismissible with Escape (modal-escape)', async () => {
    const user = userEvent.setup();
    await renderAppAt('/today', { fullSidebar: false });

    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('button', { name: 'More' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('theme hooks', () => {
  it.each(['light', 'dark'])('applies the stored %s theme to the document', async (theme) => {
    window.localStorage.setItem('tracker.theme', theme);
    await renderAppAt('/today');

    expect(document.documentElement.dataset.theme).toBe(theme);
  });
});
