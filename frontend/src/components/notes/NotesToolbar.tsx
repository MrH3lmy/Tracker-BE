import { useState } from "react";
import styles from "./NotesPage.module.css";
import type { NoteContentType } from "./noteTypes";
import { humanizeContentType, NOTE_CONTENT_TYPES, type NoteSortBy, type NotesViewMode } from "./notesPageHelpers";

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

export function NotesToolbar(props: NotesToolbarProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  return (<>
    <div className={`row ${styles.notesToolbar}`} aria-label="Note filters and view options">
      <label className={`field-stack ${styles.toolbarSearchField}`} htmlFor="noteSearch"><span>Search</span><input id="noteSearch" type="search" value={props.search} placeholder="Search title or body" onChange={(event) => props.setSearch(event.target.value)} /></label>
      <label className={`field-stack ${styles.toolbarSelectField}`} htmlFor="noteCollectionFilter"><span>Collection</span><select id="noteCollectionFilter" value={props.collectionFilter} onChange={(event) => props.setCollectionFilter(event.target.value)}><option value="">All collections</option>{props.collections.map((collection) => <option key={collection.id} value={String(collection.id)}>{collection.name}</option>)}</select></label>
      <label className={`field-stack ${styles.toolbarSelectField}`} htmlFor="noteContentTypeFilter"><span>Content type</span><select id="noteContentTypeFilter" value={props.contentTypeFilter} onChange={(event) => props.setContentTypeFilter(event.target.value as NoteContentType | "all")}><option value="all">All types</option>{NOTE_CONTENT_TYPES.map((type) => <option key={type} value={type}>{humanizeContentType(type)}</option>)}</select></label>
      <label className={`field-stack ${styles.toolbarSelectField}`} htmlFor="noteSortBy"><span>Sort by</span><select id="noteSortBy" value={props.sortBy} onChange={(event) => props.setSortBy(event.target.value as NoteSortBy)}><option value="updatedAt">Updated date</option><option value="createdAt">Created date</option><option value="displayOrder">Sticky order</option><option value="title">Title</option><option value="task">Task</option><option value="contentType">Content type</option></select></label>
      <label className={`field-stack ${styles.toolbarDirectionField}`} htmlFor="noteSortDirection"><span>Direction</span><select id="noteSortDirection" value={props.sortDirection} onChange={(event) => props.setSortDirection(event.target.value as "asc" | "desc")}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
      <div className={styles.toolbarViewToggle} role="tablist" aria-label="Note view modes">
        <span className="sr-only">View</span>
        {([ ["sticky", "Sticky board"], ["list", "List"], ["table", "Table"], ["timeline", "Timeline"] ] as const).map(([mode, label]) => <button key={mode} type="button" role="tab" aria-selected={props.viewMode === mode} className={`secondary-action ${props.viewMode === mode ? styles.viewModeActive : ""}`} onClick={() => props.setViewMode(mode)}>{label}</button>)}
      </div>
      <button
        type="button"
        className={`secondary-action ${styles.advancedFiltersButton}`}
        aria-expanded={showAdvancedFilters}
        aria-controls="noteAdvancedFilters"
        onClick={() => setShowAdvancedFilters((current) => !current)}
      >
        {showAdvancedFilters ? "Hide advanced" : "Advanced filters"}
      </button>
    </div>
    {showAdvancedFilters ? (
      <div id="noteAdvancedFilters" className={`row ${styles.endWrapRow} ${styles.sidebarAction}`}>
        <label className={`field-stack ${styles.filterSelectField}`} htmlFor="noteTagFilter"><span>Tags</span><input id="noteTagFilter" value={props.tagFilter} placeholder="Filter by tag, e.g. backend" onChange={(event) => props.setTagFilter(event.target.value)} /></label>
        <label className={`field-stack ${styles.filterNarrowField}`} htmlFor="noteHasAttachmentsFilter"><span>Attachments</span><select id="noteHasAttachmentsFilter" value={props.hasAttachmentsFilter} onChange={(event) => props.setHasAttachmentsFilter(event.target.value as "" | "true" | "false")}><option value="">Any</option><option value="true">Has attachments</option><option value="false">No attachments</option></select></label>
        <label className={`field-stack ${styles.filterNarrowField}`} htmlFor="noteLinkedTaskFilter"><span>Linked task</span><select id="noteLinkedTaskFilter" value={props.linkedTaskFilter} onChange={(event) => props.setLinkedTaskFilter(event.target.value as "" | "true" | "false")}><option value="">Any</option><option value="true">Linked</option><option value="false">Unlinked</option></select></label>
        <label className={`field-stack ${styles.filterNarrowField}`} htmlFor="noteUntaggedFilter"><span>Tag status</span><select id="noteUntaggedFilter" value={props.untaggedFilter} onChange={(event) => props.setUntaggedFilter(event.target.value as "" | "true" | "false")}><option value="">Any</option><option value="true">Untagged</option><option value="false">Tagged</option></select></label>
        <label className={`field-stack ${styles.filterTagModeField}`} htmlFor="noteTagMode"><span>Tag match</span><select id="noteTagMode" value={props.tagMode} onChange={(event) => props.setTagMode(event.target.value as "any" | "all")}><option value="any">Any tag</option><option value="all">All tags</option></select></label>
        <label className={`field-stack ${styles.filterDateField}`} htmlFor="noteCreatedFrom"><span>Created from</span><input id="noteCreatedFrom" type="date" value={props.createdFrom} onChange={(event) => props.setCreatedFrom(event.target.value)} /></label>
        <label className={`field-stack ${styles.filterDateField}`} htmlFor="noteCreatedTo"><span>Created to</span><input id="noteCreatedTo" type="date" value={props.createdTo} onChange={(event) => props.setCreatedTo(event.target.value)} /></label>
        <label className={`field-stack ${styles.filterDateField}`} htmlFor="noteUpdatedFrom"><span>Updated from</span><input id="noteUpdatedFrom" type="date" value={props.updatedFrom} onChange={(event) => props.setUpdatedFrom(event.target.value)} /></label>
        <label className={`field-stack ${styles.filterDateField}`} htmlFor="noteUpdatedTo"><span>Updated to</span><input id="noteUpdatedTo" type="date" value={props.updatedTo} onChange={(event) => props.setUpdatedTo(event.target.value)} /></label>
      </div>
    ) : null}
  </>);
}
