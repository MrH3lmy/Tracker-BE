import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AnnouncementContext } from '../../announcementContext';
import { TaskCreateForm } from './TaskCreateForm';

function renderForm(onSubmit = vi.fn(), announce = vi.fn()) {
  render(
    <AnnouncementContext.Provider value={{ message: '', announce }}>
      <TaskCreateForm
        activeTasks={[]}
        busy={false}
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        onInvalidTitle={vi.fn()}
      />
    </AnnouncementContext.Provider>,
  );
  return { onSubmit, announce };
}

describe('TaskCreateForm cross-field validation', () => {
  it('blocks submit and explains why when status is Blocked with no blocked reason', async () => {
    const user = userEvent.setup();
    const { onSubmit, announce } = renderForm();

    await user.type(screen.getByLabelText('Title'), 'Ship release');
    await user.selectOptions(screen.getByLabelText('Status'), 'BLOCKED');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Required when status is Blocked.')).toBeInTheDocument();
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('Required when status is Blocked.'));
  });

  it('submits once a blocked reason is provided', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText('Title'), 'Ship release');
    await user.selectOptions(screen.getByLabelText('Status'), 'BLOCKED');
    await user.type(screen.getByLabelText('Blocked reason'), 'Waiting on legal review');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('blocks submit when status is Waiting without waitingOn and followUpDate', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText('Title'), 'Ship release');
    await user.selectOptions(screen.getByLabelText('Status'), 'WAITING');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText('Required when status is Waiting.')).toHaveLength(2);
  });

  it('blocks submit when risk level is High without a risk reason', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText('Title'), 'Ship release');
    await user.selectOptions(screen.getByLabelText('Risk level'), 'HIGH');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Required when risk level is High or Critical.')).toBeInTheDocument();
  });
});

describe('TaskCreateForm capture flow (issue #304)', () => {
  it('keeps quick capture short and reveals the rest behind one disclosure', async () => {
    const user = userEvent.setup();
    renderForm();

    // Essentials are visible straight away...
    ['Title', 'Description', 'Status', 'Due date', 'Parent task', 'Effort', 'Risk level', 'Follow-up date']
      .forEach((label) => expect(screen.getByLabelText(label)).toBeInTheDocument());

    // ...the accounting/classification fields are not, until asked for.
    expect(screen.queryByLabelText('Estimated minutes')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Repeats')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /More details/ }));

    expect(await screen.findByLabelText('Estimated minutes')).toBeInTheDocument();
    expect(screen.getByLabelText('Start date')).toBeInTheDocument();
    expect(screen.getByLabelText('Area')).toBeInTheDocument();
    expect(screen.getByLabelText('Track')).toBeInTheDocument();
    expect(screen.getByLabelText('Phase')).toBeInTheDocument();
    expect(screen.getByLabelText('Repeats')).toBeInTheDocument();
  });

  it('reveals a cross-field requirement only once the status that needs it is chosen', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.queryByLabelText('Blocked reason')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Status'), 'BLOCKED');
    expect(screen.getByLabelText('Blocked reason')).toBeInTheDocument();

    expect(screen.queryByLabelText('Risk reason')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Risk level'), 'CRITICAL');
    expect(screen.getByLabelText('Risk reason')).toBeInTheDocument();
  });

  it('shows a focusable error summary that links to each invalid field, keeping inline errors', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.selectOptions(screen.getByLabelText('Status'), 'WAITING');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(onSubmit).not.toHaveBeenCalled();
    const summary = screen.getByRole('alert');
    expect(summary).toHaveFocus();
    expect(within(summary).getByRole('link', { name: 'Title: Enter a task title.' })).toHaveAttribute('href', '#taskTitle');
    expect(within(summary).getByRole('link', { name: 'Waiting on: Required when status is Waiting.' })).toHaveAttribute('href', '#taskWaitingOn');
    expect(within(summary).getByRole('link', { name: 'Follow-up date: Required when status is Waiting.' })).toHaveAttribute('href', '#taskFollowUpDate');

    // Inline field errors are retained alongside the summary.
    expect(screen.getAllByText('Required when status is Waiting.')).toHaveLength(2);
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not mark an untouched title as invalid before the first submit', () => {
    renderForm();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
