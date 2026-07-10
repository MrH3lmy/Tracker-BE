// Temporary showcase of the redesign primitives, mounted on the dev-only
// Developer Tools page so each primitive can be verified visually and with a
// keyboard before pages adopt it. Removed once the migration completes.
import { useState } from 'react';
import { ProgressBar } from '../ProgressBar';
import { StackedProgressBar } from '../StackedProgressBar';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Collapsible,
  Dialog,
  Drawer,
  EmptyState,
  Field,
  Checkbox,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SegmentedControl,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '../ui';
import { Filter, Inbox, MoreHorizontal, Pencil, Plus, Trash2 } from '../ui/icons';

export function PrimitivesGallery() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [segment, setSegment] = useState<'board' | 'today' | 'weekly'>('board');

  return (
    <Card>
      <CardHeader
        title="UI primitives gallery"
        description="Temporary showcase used to verify the redesign kit. Removed at the end of the migration."
      />
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Buttons</h4>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary"><Plus className="h-4 w-4" aria-hidden />New task</Button>
            <Button variant="secondary"><Filter className="h-4 w-4" aria-hidden />Filters</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger"><Trash2 className="h-4 w-4" aria-hidden />Delete</Button>
            <Button variant="secondary" size="sm">Small</Button>
            <Button variant="ghost" iconOnly aria-label="Edit"><Pencil className="h-4 w-4" aria-hidden /></Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Badges</h4>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Neutral</Badge>
            <Badge variant="brand">In progress</Badge>
            <Badge variant="positive">Done</Badge>
            <Badge variant="caution">Due soon</Badge>
            <Badge variant="critical">Overdue</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Overlays</h4>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
            <Button onClick={() => setDrawerOpen(true)}>Open drawer</Button>
            <Menu>
              <MenuTrigger asChild>
                <Button variant="ghost" iconOnly aria-label="More actions"><MoreHorizontal className="h-4 w-4" aria-hidden /></Button>
              </MenuTrigger>
              <MenuContent>
                <MenuItem>Edit</MenuItem>
                <MenuItem>Duplicate</MenuItem>
                <MenuSeparator />
                <MenuItem destructive>Delete</MenuItem>
              </MenuContent>
            </Menu>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="secondary">Open popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-sm text-fg">Popover content with a <strong>focusable</strong> area.</p>
              </PopoverContent>
            </Popover>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title="Convert note to task"
            description="Dialog primitive with focus trap and Escape handling."
            footer={
              <>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setDialogOpen(false)}>Convert</Button>
              </>
            }
          >
            <Field label="Task title" htmlFor="gallery-dialog-title">
              <Input id="gallery-dialog-title" defaultValue="Follow up on release notes" />
            </Field>
          </Dialog>
          <Drawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            title="Create task"
            description="Drawer primitive used by create flows."
            footer={
              <>
                <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setDrawerOpen(false)}>Create</Button>
              </>
            }
          >
            <div className="flex flex-col gap-4">
              <Field label="Title" htmlFor="gallery-drawer-title">
                <Input id="gallery-drawer-title" placeholder="What needs to happen?" />
              </Field>
              <Field label="Effort" htmlFor="gallery-drawer-effort">
                <Select id="gallery-drawer-effort" defaultValue="M">
                  <option value="S">Small</option>
                  <option value="M">Medium</option>
                  <option value="L">Large</option>
                </Select>
              </Field>
              <Field label="Description" htmlFor="gallery-drawer-desc" hint="Optional context for the task.">
                <Textarea id="gallery-drawer-desc" />
              </Field>
              <Checkbox label="Mark as important" />
            </div>
          </Drawer>
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Tabs &amp; segmented control</h4>
          <SegmentedControl
            aria-label="Planning view"
            value={segment}
            onValueChange={setSegment}
            options={[
              { value: 'board', label: 'Project board' },
              { value: 'today', label: 'Today' },
              { value: 'weekly', label: 'Weekly' },
            ]}
          />
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="done">Done</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="pt-3 text-sm text-fg-muted">Active tasks panel.</TabsContent>
            <TabsContent value="done" className="pt-3 text-sm text-fg-muted">Done tasks panel.</TabsContent>
            <TabsContent value="archived" className="pt-3 text-sm text-fg-muted">Archived tasks panel.</TabsContent>
          </Tabs>
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Table</h4>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Task</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Due</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Ship redesign phase 2</TableCell>
                <TableCell><Badge variant="brand">In progress</Badge></TableCell>
                <TableCell className="text-fg-muted">Tomorrow</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Review token contrast</TableCell>
                <TableCell><Badge variant="positive">Done</Badge></TableCell>
                <TableCell className="text-fg-muted">Yesterday</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Progress &amp; empty state</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <ProgressBar label="Sprint completion" value={64} helperText="16 of 25 tasks done" />
            <StackedProgressBar
              label="Tasks by status"
              segments={[
                { label: 'Done', value: 16, variant: 'success' },
                { label: 'In progress', value: 6, variant: 'primary' },
                { label: 'Blocked', value: 3, variant: 'danger' },
              ]}
            />
          </div>
          <EmptyState
            icon={Inbox}
            title="No tasks match these filters"
            description="Try clearing a filter, or create a new task to get started."
            action={<Button variant="primary" size="sm"><Plus className="h-4 w-4" aria-hidden />New task</Button>}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Collapsible</h4>
          <Collapsible title="Advanced: raw settings JSON" badge={<Badge variant="caution">2 issues</Badge>}>
            <p className="text-sm text-fg-muted">Collapsed advanced content lives here.</p>
          </Collapsible>
        </section>
      </div>
    </Card>
  );
}
