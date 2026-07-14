import { useState } from "react";
import { ActiveFilterChips, type ActiveFilterChip } from "./ActiveFilterChips";
import type { NoteContentType } from "./noteTypes";
import { humanizeContentType, NOTE_CONTENT_TYPES, type NoteSortBy, type NotesViewMode } from "./notesPageHelpers";
import { Badge, Button, Field, Input, Popover, PopoverContent, PopoverTrigger, SegmentedControl, Select } from "../ui";
import { Filter, Search } from "../ui/icons";

interface NotesToolbarProps {
  search: string; setSearch: (value: string) => void;
  tagFilter: string; setTagFilter: (value: string) => void;
  collectionFilter: string; setCollectionFilter: (value: string) => void;
  collections: Array<{ id: number; name: string }>;
  contentTypeFilter: NoteContentType | "all"; setContentTypeFilter: (value: NoteContentType | "all") => void;
  hasAttachmentsFilter: "" | "true" | "false"; setHasAttachmentsFilter: (value: "" | "true" | "false") => void;
  linkedTaskFilter: "" | "true" | "false"; setLinkedTaskFilter: (value: "" | "true" | "false") => void;
  untaggedFilter: "" | "true" | "false"; setUntaggedFilter: (value: "" | "true" | "false") => void;
  tagMode: "any" | "all"; setTagMode: (value: "any" | "all") => void;
  createdFrom: string; setCreatedFrom: (value: string) => void;
  createdTo: string; setCreatedTo: (value: string) => void;
  updatedFrom: string; setUpdatedFrom: (value: string) => void;
  updatedTo: string; setUpdatedTo: (value: string) => void;
  viewMode: NotesViewMode; setViewMode: (value: NotesViewMode) => void;
  sortBy: NoteSortBy; setSortBy: (value: NoteSortBy) => void;
  sortDirection: "asc" | "desc"; setSortDirection: (value: "asc" | "desc") => void;
}

const VIEW_MODE_OPTIONS: Array<{ value: NotesViewMode; label: string }> = [
  { value: "sticky", label: "Sticky board" },
  { value: "list", label: "List" },
  { value: "table", label: "Table" },
  { value: "timeline", label: "Timeline" },
];

export function NotesToolbar(props: NotesToolbarProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const advancedFilterCount = [
    props.collectionFilter,
    props.contentTypeFilter !== "all" ? props.contentTypeFilter : "",
    props.tagFilter.trim(),
    props.hasAttachmentsFilter,
    props.linkedTaskFilter,
    props.untaggedFilter,
    props.createdFrom,
    props.createdTo,
    props.updatedFrom,
    props.updatedTo,
  ].filter(Boolean).length;

  const selectedCollectionName = props.collections.find((collection) => String(collection.id) === props.collectionFilter)?.name;
  const filterChips: ActiveFilterChip[] = [
    selectedCollectionName ? { key: "collection", label: `Collection: ${selectedCollectionName}`, onClear: () => props.setCollectionFilter("") } : null,
    props.contentTypeFilter !== "all" ? { key: "contentType", label: `Type: ${humanizeContentType(props.contentTypeFilter)}`, onClear: () => props.setContentTypeFilter("all") } : null,
    props.tagFilter.trim() ? { key: "tag", label: `Tag: ${props.tagFilter.trim()}`, onClear: () => props.setTagFilter("") } : null,
    props.hasAttachmentsFilter ? { key: "attachments", label: props.hasAttachmentsFilter === "true" ? "Has attachments" : "No attachments", onClear: () => props.setHasAttachmentsFilter("") } : null,
    props.linkedTaskFilter ? { key: "linkedTask", label: props.linkedTaskFilter === "true" ? "Linked to task" : "Unlinked", onClear: () => props.setLinkedTaskFilter("") } : null,
    props.untaggedFilter ? { key: "untagged", label: props.untaggedFilter === "true" ? "Untagged" : "Tagged", onClear: () => props.setUntaggedFilter("") } : null,
    props.createdFrom ? { key: "createdFrom", label: `Created from ${props.createdFrom}`, onClear: () => props.setCreatedFrom("") } : null,
    props.createdTo ? { key: "createdTo", label: `Created to ${props.createdTo}`, onClear: () => props.setCreatedTo("") } : null,
    props.updatedFrom ? { key: "updatedFrom", label: `Updated from ${props.updatedFrom}`, onClear: () => props.setUpdatedFrom("") } : null,
    props.updatedTo ? { key: "updatedTo", label: `Updated to ${props.updatedTo}`, onClear: () => props.setUpdatedTo("") } : null,
  ].filter((chip): chip is ActiveFilterChip => chip !== null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2" aria-label="Note filters and view options">
        <label className="relative min-w-56 flex-1" htmlFor="noteSearch">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <Input id="noteSearch" className="pl-9" type="search" value={props.search} placeholder="Search title or body" onChange={(event) => props.setSearch(event.target.value)} />
        </label>
        <Popover open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
          <PopoverTrigger asChild>
            <Button aria-expanded={showAdvancedFilters} aria-controls="noteAdvancedFilters">
              <Filter className="h-4 w-4" aria-hidden />
              Filters &amp; sort
              {advancedFilterCount > 0 && <Badge variant="brand" aria-label={`${advancedFilterCount} filters active`}>{advancedFilterCount}</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent id="noteAdvancedFilters" align="start" className="w-[min(36rem,calc(100vw-2rem))]" aria-label="Note filters and sort options">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Collection" htmlFor="noteCollectionFilter">
                <Select id="noteCollectionFilter" value={props.collectionFilter} onChange={(event) => props.setCollectionFilter(event.target.value)}>
                  <option value="">All collections</option>
                  {props.collections.map((collection) => <option key={collection.id} value={String(collection.id)}>{collection.name}</option>)}
                </Select>
              </Field>
              <Field label="Content type" htmlFor="noteContentTypeFilter">
                <Select id="noteContentTypeFilter" value={props.contentTypeFilter} onChange={(event) => props.setContentTypeFilter(event.target.value as NoteContentType | "all")}>
                  <option value="all">All types</option>
                  {NOTE_CONTENT_TYPES.map((type) => <option key={type} value={type}>{humanizeContentType(type)}</option>)}
                </Select>
              </Field>
              <Field label="Sort by" htmlFor="noteSortBy">
                <Select id="noteSortBy" value={props.sortBy} onChange={(event) => props.setSortBy(event.target.value as NoteSortBy)}>
                  <option value="updatedAt">Updated date</option>
                  <option value="createdAt">Created date</option>
                  <option value="displayOrder">Sticky order</option>
                  <option value="title">Title</option>
                  <option value="task">Task</option>
                  <option value="contentType">Content type</option>
                </Select>
              </Field>
              <Field label="Direction" htmlFor="noteSortDirection">
                <Select id="noteSortDirection" value={props.sortDirection} onChange={(event) => props.setSortDirection(event.target.value as "asc" | "desc")}>
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </Select>
              </Field>
              <Field label="Tags" htmlFor="noteTagFilter" className="sm:col-span-2">
                <Input id="noteTagFilter" value={props.tagFilter} placeholder="Filter by tag, e.g. backend" onChange={(event) => props.setTagFilter(event.target.value)} />
              </Field>
              <Field label="Attachments" htmlFor="noteHasAttachmentsFilter">
                <Select id="noteHasAttachmentsFilter" value={props.hasAttachmentsFilter} onChange={(event) => props.setHasAttachmentsFilter(event.target.value as "" | "true" | "false")}>
                  <option value="">Any</option>
                  <option value="true">Has attachments</option>
                  <option value="false">No attachments</option>
                </Select>
              </Field>
              <Field label="Linked task" htmlFor="noteLinkedTaskFilter">
                <Select id="noteLinkedTaskFilter" value={props.linkedTaskFilter} onChange={(event) => props.setLinkedTaskFilter(event.target.value as "" | "true" | "false")}>
                  <option value="">Any</option>
                  <option value="true">Linked</option>
                  <option value="false">Unlinked</option>
                </Select>
              </Field>
              <Field label="Tag status" htmlFor="noteUntaggedFilter">
                <Select id="noteUntaggedFilter" value={props.untaggedFilter} onChange={(event) => props.setUntaggedFilter(event.target.value as "" | "true" | "false")}>
                  <option value="">Any</option>
                  <option value="true">Untagged</option>
                  <option value="false">Tagged</option>
                </Select>
              </Field>
              <Field label="Tag match" htmlFor="noteTagMode">
                <Select id="noteTagMode" value={props.tagMode} onChange={(event) => props.setTagMode(event.target.value as "any" | "all")}>
                  <option value="any">Any tag</option>
                  <option value="all">All tags</option>
                </Select>
              </Field>
              <Field label="Created from" htmlFor="noteCreatedFrom">
                <Input id="noteCreatedFrom" type="date" value={props.createdFrom} onChange={(event) => props.setCreatedFrom(event.target.value)} />
              </Field>
              <Field label="Created to" htmlFor="noteCreatedTo">
                <Input id="noteCreatedTo" type="date" value={props.createdTo} onChange={(event) => props.setCreatedTo(event.target.value)} />
              </Field>
              <Field label="Updated from" htmlFor="noteUpdatedFrom">
                <Input id="noteUpdatedFrom" type="date" value={props.updatedFrom} onChange={(event) => props.setUpdatedFrom(event.target.value)} />
              </Field>
              <Field label="Updated to" htmlFor="noteUpdatedTo">
                <Input id="noteUpdatedTo" type="date" value={props.updatedTo} onChange={(event) => props.setUpdatedTo(event.target.value)} />
              </Field>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <ActiveFilterChips chips={filterChips} />
      <SegmentedControl
        aria-label="Note view modes"
        value={props.viewMode}
        onValueChange={props.setViewMode}
        options={VIEW_MODE_OPTIONS}
      />
    </div>
  );
}
