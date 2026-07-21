import { render, screen } from '@testing-library/react';
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
