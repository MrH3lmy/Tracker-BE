import type { NoteContentType } from "./noteTypes";
import { humanizeContentType, NOTE_CONTENT_TYPES, type NoteSortBy, type NotesViewMode } from "./notesPageHelpers";

interface NotesFiltersProps {
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

export function NotesFilters(props: NotesFiltersProps) {
  return (<>
    <div className="row" style={{ alignItems: "end", flexWrap: "wrap" }}>
      <label className="field-stack" htmlFor="noteSearch" style={{ flex: "1 1 18rem" }}><span>Search</span><input id="noteSearch" type="search" value={props.search} placeholder="Search title or body" onChange={(event) => props.setSearch(event.target.value)} /></label>
      <label className="field-stack" htmlFor="noteTagFilter" style={{ flex: "1 1 16rem" }}><span>Tags</span><input id="noteTagFilter" value={props.tagFilter} placeholder="Filter by tag, e.g. backend" onChange={(event) => props.setTagFilter(event.target.value)} /></label>
      <label className="field-stack" htmlFor="noteCollectionFilter" style={{ flex: "0 1 16rem" }}><span>Collection</span><select id="noteCollectionFilter" value={props.collectionFilter} onChange={(event) => props.setCollectionFilter(event.target.value)}><option value="">All collections</option>{props.collections.map((collection) => <option key={collection.id} value={String(collection.id)}>{collection.name}</option>)}</select></label>
      <label className="field-stack" htmlFor="noteContentTypeFilter" style={{ flex: "0 1 16rem" }}><span>Content type</span><select id="noteContentTypeFilter" value={props.contentTypeFilter} onChange={(event) => props.setContentTypeFilter(event.target.value as NoteContentType | "all")}><option value="all">All types</option>{NOTE_CONTENT_TYPES.map((type) => <option key={type} value={type}>{humanizeContentType(type)}</option>)}</select></label>
    </div>
    <div className="row" style={{ alignItems: "end", flexWrap: "wrap", marginTop: "var(--space-3)" }}>
      <label className="field-stack" htmlFor="noteHasAttachmentsFilter" style={{ flex: "0 1 12rem" }}><span>Attachments</span><select id="noteHasAttachmentsFilter" value={props.hasAttachmentsFilter} onChange={(event) => props.setHasAttachmentsFilter(event.target.value as "" | "true" | "false")}><option value="">Any</option><option value="true">Has attachments</option><option value="false">No attachments</option></select></label>
      <label className="field-stack" htmlFor="noteLinkedTaskFilter" style={{ flex: "0 1 12rem" }}><span>Linked task</span><select id="noteLinkedTaskFilter" value={props.linkedTaskFilter} onChange={(event) => props.setLinkedTaskFilter(event.target.value as "" | "true" | "false")}><option value="">Any</option><option value="true">Linked</option><option value="false">Unlinked</option></select></label>
      <label className="field-stack" htmlFor="noteUntaggedFilter" style={{ flex: "0 1 12rem" }}><span>Tag status</span><select id="noteUntaggedFilter" value={props.untaggedFilter} onChange={(event) => props.setUntaggedFilter(event.target.value as "" | "true" | "false")}><option value="">Any</option><option value="true">Untagged</option><option value="false">Tagged</option></select></label>
      <label className="field-stack" htmlFor="noteTagMode" style={{ flex: "0 1 10rem" }}><span>Tag match</span><select id="noteTagMode" value={props.tagMode} onChange={(event) => props.setTagMode(event.target.value as "any" | "all")}><option value="any">Any tag</option><option value="all">All tags</option></select></label>
      <label className="field-stack" htmlFor="noteCreatedFrom" style={{ flex: "0 1 11rem" }}><span>Created from</span><input id="noteCreatedFrom" type="date" value={props.createdFrom} onChange={(event) => props.setCreatedFrom(event.target.value)} /></label>
      <label className="field-stack" htmlFor="noteCreatedTo" style={{ flex: "0 1 11rem" }}><span>Created to</span><input id="noteCreatedTo" type="date" value={props.createdTo} onChange={(event) => props.setCreatedTo(event.target.value)} /></label>
      <label className="field-stack" htmlFor="noteUpdatedFrom" style={{ flex: "0 1 11rem" }}><span>Updated from</span><input id="noteUpdatedFrom" type="date" value={props.updatedFrom} onChange={(event) => props.setUpdatedFrom(event.target.value)} /></label>
      <label className="field-stack" htmlFor="noteUpdatedTo" style={{ flex: "0 1 11rem" }}><span>Updated to</span><input id="noteUpdatedTo" type="date" value={props.updatedTo} onChange={(event) => props.setUpdatedTo(event.target.value)} /></label>
    </div>
    <div className="row compact-row" role="tablist" aria-label="Note view modes" style={{ marginTop: "var(--space-4)" }}>
      {([ ["sticky", "Sticky board"], ["list", "List"], ["table", "Table"], ["timeline", "Timeline"] ] as const).map(([mode, label]) => <button key={mode} type="button" role="tab" aria-selected={props.viewMode === mode} className={props.viewMode === mode ? "button-primary" : "secondary-action"} onClick={() => props.setViewMode(mode)}>{label}</button>)}
      <label className="field-stack" htmlFor="noteSortBy" style={{ minWidth: "12rem" }}><span>Sort by</span><select id="noteSortBy" value={props.sortBy} onChange={(event) => props.setSortBy(event.target.value as NoteSortBy)}><option value="updatedAt">Updated date</option><option value="createdAt">Created date</option><option value="displayOrder">Sticky order</option><option value="title">Title</option><option value="task">Task</option><option value="contentType">Content type</option></select></label>
      <label className="field-stack" htmlFor="noteSortDirection" style={{ minWidth: "10rem" }}><span>Direction</span><select id="noteSortDirection" value={props.sortDirection} onChange={(event) => props.setSortDirection(event.target.value as "asc" | "desc")}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
    </div>
  </>);
}
