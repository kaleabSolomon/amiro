import { DEFAULT_WEB_APP_URL } from "../lib/config";
import type {
  AuthSessionState,
  BookmarkItem,
  CapturePayload,
  ExtensionMessage,
  ExtensionMessageResponse,
  FolderOption,
  ImportStrategy,
  SearchResult,
  Visibility,
} from "../types/messages";

// Emoji set mirrors the web app's NewFolderDialog FOLDER_ICONS.
const FOLDER_ICONS = ["📁", "⭐", "💡", "📚", "🎨", "💼", "🔖", "🧠"];
const AUTH_SESSION_KEY = "amiro_auth_session";
const CAPTURE_QUEUE_KEY = "amiro_capture_queue";

type TabName = "save" | "bookmarks" | "queued" | "settings";

// ── DOM references (grabbed once) ─────────────────────────────────
const $ = <T extends Element>(selector: string) =>
  document.querySelector<T>(selector);

const tabs: Record<TabName, HTMLButtonElement | null> = {
  save: $<HTMLButtonElement>("#tab-save"),
  bookmarks: $<HTMLButtonElement>("#tab-bookmarks"),
  queued: $<HTMLButtonElement>("#tab-queued"),
  settings: $<HTMLButtonElement>("#tab-settings"),
};
const panels: Record<TabName, HTMLElement | null> = {
  save: $<HTMLElement>("#panel-save"),
  bookmarks: $<HTMLElement>("#panel-bookmarks"),
  queued: $<HTMLElement>("#panel-queued"),
  settings: $<HTMLElement>("#panel-settings"),
};

const connPill = $<HTMLSpanElement>("#conn-pill");
const connPillLabel = $<HTMLSpanElement>("#conn-pill-label");

const saveFolderField = $<HTMLDivElement>("#save-folder-field");
const saveVisibilityField = $<HTMLDivElement>("#save-visibility-field");
const saveOfflineHint = $<HTMLParagraphElement>("#save-offline-hint");

const previewAvatar = $<HTMLSpanElement>("#preview-avatar");
const previewTitle = $<HTMLSpanElement>("#preview-title");
const previewDomain = $<HTMLSpanElement>("#preview-domain");

const folderSelect = $<HTMLSelectElement>("#folder-select");
const createFolderToggle = $<HTMLButtonElement>("#toggle-create-folder");
const createFolderPanel = $<HTMLDivElement>("#create-folder-panel");
const newFolderNameInput = $<HTMLInputElement>("#new-folder-name");
const emojiGrid = $<HTMLDivElement>("#emoji-grid");
const createFolderButton = $<HTMLButtonElement>("#create-folder");
const cancelCreateFolderButton = $<HTMLButtonElement>("#cancel-create-folder");

const captureButton = $<HTMLButtonElement>("#capture");
const visHint = $<HTMLParagraphElement>("#vis-hint");
const status = $<HTMLDivElement>("#status");

const connectButton = $<HTMLButtonElement>("#connect");
const disconnectButton = $<HTMLButtonElement>("#disconnect");
const connectionState = $<HTMLParagraphElement>("#connection-state");
const sourceLabel = $<HTMLElement>("#source-label");
const importButton = $<HTMLButtonElement>("#import-bookmarks");
const exportButton = $<HTMLButtonElement>("#export-bookmarks");
const transferState = $<HTMLParagraphElement>("#transfer-state");

const connectBmButton = $<HTMLButtonElement>("#connect-bm");
const bmConnectNudge = $<HTMLDivElement>("#bm-connect-nudge");
const bmPendingList = $<HTMLDivElement>("#bm-pending-list");
const queuedCount = $<HTMLSpanElement>("#queued-count");
const queuedEmpty = $<HTMLParagraphElement>("#queued-empty");
const bmBody = $<HTMLDivElement>("#bm-body");
const bmFolders = $<HTMLDivElement>("#bm-folders");
const bmList = $<HTMLDivElement>("#bm-list");
const bmSearchInput = $<HTMLInputElement>("#bm-search-input");
const bmSearchClear = $<HTMLButtonElement>("#bm-search-clear");

// ── State ─────────────────────────────────────────────────────────
let currentSession: AuthSessionState | null = null;
let captureVisibility: Visibility = "private";
let folderVisibility: Visibility = "private";
let selectedIcon = FOLDER_ICONS[0];
let folderTree: FolderOption[] = [];
let selectedBmFolderId = "unfiled";
let bookmarksInitialized = false;
let searchQuery = "";
let importStrategy: ImportStrategy = "keep-folders";
let searchTimer: ReturnType<typeof setTimeout> | undefined;

// Auto tags applied on capture are noise in the row UI; hide them.

// ── Status bar ────────────────────────────────────────────────────
type StatusKind = "default" | "pending" | "success" | "error";

function setStatus(message: string, kind: StatusKind = "default") {
  if (!status) {
    return;
  }
  status.textContent = message;
  if (message && kind !== "default") {
    status.dataset.kind = kind;
  } else {
    delete status.dataset.kind;
  }
}

// Wraps runtime messaging. When the background service worker is stale (e.g. it
// lacks a newly-added handler after an update), sendMessage resolves to
// undefined and the channel closes — surface that as an actionable error
// instead of a cryptic "reading 'ok' of undefined".
async function send(
  message: ExtensionMessage,
): Promise<ExtensionMessageResponse> {
  const response = (await chrome.runtime.sendMessage(message)) as
    | ExtensionMessageResponse
    | undefined;
  if (!response) {
    throw new Error(
      "Extension background isn’t responding. Reload the extension from chrome://extensions and try again.",
    );
  }
  return response;
}

// ── Tab switching ─────────────────────────────────────────────────
function activateTab(name: TabName) {
  for (const key of Object.keys(tabs) as TabName[]) {
    const tab = tabs[key];
    const panel = panels[key];
    const active = key === name;
    tab?.setAttribute("aria-selected", active ? "true" : "false");
    if (panel) {
      panel.hidden = !active;
    }
  }

  // Lazily load bookmarks the first time the tab is opened.
  if (name === "bookmarks" && currentSession && !bookmarksInitialized) {
    bookmarksInitialized = true;
    void loadBookmarks();
  }

  // The flusher drains the queue in the background, so re-read on every open
  // rather than trusting whatever was rendered when the popup mounted.
  if (name === "queued") {
    void refreshPending();
  }
}

function wireTabs() {
  const order: TabName[] = ["save", "bookmarks", "queued", "settings"];
  for (const name of order) {
    tabs[name]?.addEventListener("click", () => activateTab(name));
    tabs[name]?.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return;
      }
      event.preventDefault();
      const index = order.indexOf(name);
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = order[(index + delta + order.length) % order.length];
      if (!next) {
        return;
      }
      activateTab(next);
      tabs[next]?.focus();
    });
  }
}

// ── Connection state ──────────────────────────────────────────────
function setConnectionState(session: AuthSessionState | null) {
  currentSession = session;
  const connected = Boolean(session);

  connPill?.setAttribute("data-connected", connected ? "true" : "false");
  if (connPillLabel) {
    connPillLabel.textContent = connected ? "Connected" : "Not connected";
  }

  if (connectionState) {
    connectionState.textContent = session
      ? `Connected to ${session.webAppUrl}`
      : "Not connected";
  }

  connectButton?.classList.toggle("hidden", connected);
  disconnectButton?.classList.toggle("hidden", !connected);

  // Save tab: the form is always available (saving works offline). Folder and
  // visibility controls only make sense once connected; otherwise the capture
  // is queued locally.
  saveFolderField?.classList.toggle("hidden", !connected);
  saveVisibilityField?.classList.toggle("hidden", !connected);
  saveOfflineHint?.classList.toggle("hidden", connected);

  // Bookmarks tab: browsing needs a connection; nudge otherwise.
  bmConnectNudge?.classList.toggle("hidden", connected);
  bmBody?.classList.toggle("hidden", !connected);

  if (!session) {
    setFolderOptions([]);
    folderTree = [];
    selectedBmFolderId = "unfiled";
    bookmarksInitialized = false;
    resetSearch();
    if (bmFolders) {
      bmFolders.innerHTML = "";
    }
    if (bmList) {
      bmList.innerHTML = "";
    }
  }

  // Keeps the Queued tab badge accurate no matter which panel is showing.
  void refreshPending();
}

// ── Folder select ─────────────────────────────────────────────────
function setFolderOptions(folders: FolderOption[], selectedFolderId?: string) {
  if (!folderSelect) {
    return;
  }

  const previousSelection = folderSelect.value;
  folderSelect.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "📥 Unfiled";
  folderSelect.append(defaultOption);

  for (const folder of folders) {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = folder.name;
    folderSelect.append(option);
  }

  const nextSelection = selectedFolderId ?? previousSelection;
  if (
    nextSelection &&
    Array.from(folderSelect.options).some((opt) => opt.value === nextSelection)
  ) {
    folderSelect.value = nextSelection;
  }

  folderSelect.disabled = !currentSession;
}

// ── Visibility rule (mirrors backend) ─────────────────────────────
// A bookmark may be public only inside a public folder. The Save toggle's
// "Public" option is therefore only available when a public folder is picked.
const captureVisButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-vis]"),
);

function getSelectedFolderVisibility(): Visibility {
  const value = folderSelect?.value ?? "";
  const id = value === "" ? "unfiled" : value;
  return folderTree.find((folder) => folder.id === id)?.visibility ?? "private";
}

function updateVisibilityHint() {
  if (!visHint) {
    return;
  }
  if (getSelectedFolderVisibility() !== "public") {
    visHint.textContent =
      "Only you can see this — save to a public folder to share it.";
  } else if (captureVisibility === "public") {
    visHint.textContent = "Anyone with the link can view this.";
  } else {
    visHint.textContent = "Only you can view this.";
  }
}

function applyCaptureVisibility(next: Visibility) {
  captureVisibility = next;
  for (const button of captureVisButtons) {
    button.setAttribute(
      "aria-pressed",
      button.dataset.vis === next ? "true" : "false",
    );
  }
  updateVisibilityHint();
}

function updateVisibilityAvailability() {
  const publicAllowed = getSelectedFolderVisibility() === "public";
  const publicButton = captureVisButtons.find(
    (button) => button.dataset.vis === "public",
  );
  if (publicButton) {
    publicButton.disabled = !publicAllowed;
  }
  // Enforce the invariant client-side too: never leave "public" selected for a
  // folder that can't hold public bookmarks.
  if (!publicAllowed && captureVisibility === "public") {
    applyCaptureVisibility("private");
    return;
  }
  updateVisibilityHint();
}

async function loadFolders() {
  if (!currentSession) {
    setFolderOptions([]);
    return;
  }

  try {
    const response = await send({
      type: "amiro/get-folders",
    } satisfies ExtensionMessage);

    if (!response.ok) {
      throw new Error(response.error);
    }

    folderTree = response.folders ?? [];
    // The Save-tab select carries its own "Unfiled" default option, so drop the
    // synthetic tree entry to avoid a duplicate.
    setFolderOptions(folderTree.filter((folder) => folder.id !== "unfiled"));
    renderFolderFilter();
    updateVisibilityAvailability();
  } catch (error) {
    // Folder loading runs automatically (on open / reconnect). A failure here is
    // usually a stale session returning 401 — which the background clears,
    // flipping the UI to disconnected via storage.onChanged. So don't nag the
    // user with an error; just reset quietly.
    console.warn("[amiro] failed to load folders", error);
    setFolderOptions([]);
    folderTree = [];
    renderFolderFilter();
    updateVisibilityAvailability();
  }
}

// ── Bookmarks tab ─────────────────────────────────────────────────
/**
 * Folder picker for the browse view.
 *
 * Was a wrapping row of pills with no upper bound — a dozen folders pushed the
 * bookmark list most of the way down a 600px popup. A select is fixed height
 * whatever the folder count, and shows the current folder as its own label.
 */
function renderFolderFilter() {
  if (!bmFolders) {
    return;
  }
  bmFolders.innerHTML = "";

  if (!folderTree.some((folder) => folder.id === selectedBmFolderId)) {
    selectedBmFolderId = "unfiled";
  }

  if (folderTree.length === 0) {
    return;
  }

  const select = document.createElement("select");
  select.className = "select folder-select";
  select.setAttribute("aria-label", "Filter by folder");

  for (const folder of folderTree) {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = `${folder.icon || "📁"}  ${folder.name}  (${folder.itemCount ?? 0})`;
    option.selected = folder.id === selectedBmFolderId;
    select.append(option);
  }

  select.addEventListener("change", () => {
    if (!select.value || select.value === selectedBmFolderId) {
      return;
    }
    selectedBmFolderId = select.value;
    void loadBookmarks();
  });

  bmFolders.append(select);
}

function renderBmState(kind: "loading" | "empty" | "error", message?: string) {
  if (!bmList) {
    return;
  }
  bmList.innerHTML = "";
  const state = document.createElement("div");
  state.className = "bm-state";

  if (kind === "loading") {
    const spinner = document.createElement("div");
    spinner.className = "spinner";
    spinner.setAttribute("aria-hidden", "true");
    const text = document.createElement("p");
    text.textContent = "Loading bookmarks…";
    state.append(spinner, text);
  } else {
    const text = document.createElement("p");
    if (kind === "empty") {
      text.textContent = "No bookmarks in this folder yet.";
    } else {
      text.textContent = message || "Failed to load bookmarks.";
    }
    state.append(text);
  }

  bmList.append(state);
}

async function loadBookmarks() {
  if (!currentSession || !bmList) {
    return;
  }

  renderBmState("loading");

  try {
    const folderId =
      selectedBmFolderId === "unfiled" ? undefined : selectedBmFolderId;
    const response = await send({
      type: "amiro/get-bookmarks",
      folderId,
      limit: 50,
    } satisfies ExtensionMessage);

    if (!response.ok) {
      throw new Error(response.error);
    }

    renderBookmarks(response.bookmarks ?? []);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load bookmarks.";
    renderBmState("error", message);
  }
}

function renderBookmarks(items: BookmarkItem[]) {
  if (!bmList) {
    return;
  }

  if (items.length === 0) {
    renderBmState("empty");
    return;
  }

  bmList.innerHTML = "";
  for (const item of items) {
    bmList.append(buildBookmarkRow(item));
  }
}

// ── Pending (offline queue) ───────────────────────────────────────
async function getQueue(): Promise<CapturePayload[]> {
  const result = await chrome.storage.local.get(CAPTURE_QUEUE_KEY);
  return (result[CAPTURE_QUEUE_KEY] as CapturePayload[] | undefined) ?? [];
}

async function refreshPending() {
  renderPending(await getQueue());
}

function renderPending(queue: CapturePayload[]) {
  // The count lives on the tab so a backlog is visible from any panel —
  // previously these rows sat on top of the synced list, which meant a
  // 40-bookmark import buried everything the user actually came to browse.
  if (queuedCount) {
    queuedCount.textContent = queue.length > 99 ? "99+" : String(queue.length);
    queuedCount.classList.toggle("hidden", queue.length === 0);
  }
  queuedEmpty?.classList.toggle("hidden", queue.length > 0);

  if (!bmPendingList) {
    return;
  }
  bmPendingList.innerHTML = "";
  for (const capture of queue) {
    bmPendingList.append(buildPendingRow(capture));
  }
}

function buildPendingRow(capture: CapturePayload) {
  const row = document.createElement("div");
  row.className = "pending-row";

  const avatar = document.createElement("span");
  avatar.className = "avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = capture.title.charAt(0) || "·";

  const body = document.createElement("span");
  body.className = "bm-body";

  const title = document.createElement("span");
  title.className = "bm-title";
  title.textContent = capture.title;
  title.title = capture.title;

  const meta = document.createElement("span");
  meta.className = "bm-meta";
  const domain = document.createElement("span");
  domain.className = "bm-domain";
  domain.textContent = domainFromUrl(capture.url);
  meta.append(domain);

  // capturedAt is an ISO string in the queue (vs a number on synced rows).
  const parsedAt = Date.parse(capture.capturedAt);
  if (!Number.isNaN(parsedAt)) {
    const dot = document.createElement("span");
    dot.className = "bm-dot";
    dot.setAttribute("aria-hidden", "true");
    dot.textContent = "·";
    const time = document.createElement("span");
    time.className = "bm-time";
    time.textContent = relativeTime(parsedAt);
    meta.append(dot, time);
  }

  // Without this there's no way to get a bad capture out of the queue — it
  // would sync to the account on the next connect, wrong or not.
  const discard = document.createElement("button");
  discard.type = "button";
  discard.className = "icon-btn";
  discard.setAttribute(
    "aria-label",
    `Discard queued capture: ${capture.title}`,
  );
  discard.textContent = "✕";
  discard.addEventListener("click", () => {
    void (async () => {
      discard.disabled = true;
      try {
        const response = await send({
          type: "amiro/discard-queued-capture",
          url: capture.url,
        });
        if (!response.ok) {
          setStatus(response.error, "error");
          discard.disabled = false;
          return;
        }
        row.remove();
        renderPending(await getQueue());
        setStatus("Removed from queue.");
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "Failed to discard.",
          "error",
        );
        discard.disabled = false;
      }
    })();
  });

  body.append(title, meta);
  row.append(avatar, body, discard);
  return row;
}

// ── Search ────────────────────────────────────────────────────────
function resetSearch() {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = undefined;
  }
  searchQuery = "";
  if (bmSearchInput) {
    bmSearchInput.value = "";
  }
  bmSearchClear?.classList.add("hidden");
}

function isSearching() {
  return searchQuery.trim().length > 0;
}

function onSearchInput() {
  const value = bmSearchInput?.value ?? "";
  searchQuery = value;
  bmSearchClear?.classList.toggle("hidden", value.length === 0);

  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  if (!value.trim()) {
    // Back to folder-browse mode.
    bmFolders?.classList.remove("hidden");
    void loadBookmarks();
    return;
  }

  searchTimer = setTimeout(() => void runSearch(value), 200);
}

async function runSearch(query: string) {
  if (!currentSession || !bmList) {
    return;
  }

  bmFolders?.classList.add("hidden");
  renderBmState("loading");

  try {
    const response = await send({
      type: "amiro/search",
      query,
      limit: 30,
    } satisfies ExtensionMessage);

    if (!response.ok) {
      throw new Error(response.error);
    }

    // Drop stale responses if the query changed while this one was in flight.
    if (searchQuery.trim() !== query.trim()) {
      return;
    }

    renderSearchResults(
      response.search ?? { folders: [], bookmarks: [] },
      query,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed.";
    renderBmState("error", message);
  }
}

function renderSearchResults(result: SearchResult, query: string) {
  if (!bmList) {
    return;
  }

  bmList.innerHTML = "";

  if (result.folders.length === 0 && result.bookmarks.length === 0) {
    const state = document.createElement("div");
    state.className = "bm-state";
    const text = document.createElement("p");
    text.textContent = `No results for “${query.trim()}”.`;
    state.append(text);
    bmList.append(state);
    return;
  }

  if (result.folders.length > 0) {
    const label = document.createElement("p");
    label.className = "bm-section-label";
    label.textContent = "Folders";
    bmList.append(label);

    const folderRow = document.createElement("div");
    // Pills are fine here: search returns a bounded handful of matches, unlike
    // the browse filter which has to cope with every folder you own.
    folderRow.className = "folder-results";
    for (const folder of result.folders) {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "folder-pill";

      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = folder.icon || "📁";

      const name = document.createElement("span");
      name.className = "folder-pill-name";
      name.textContent = folder.name;

      pill.append(icon, name);
      pill.addEventListener("click", () => openFolderFromSearch(folder.id));
      folderRow.append(pill);
    }
    bmList.append(folderRow);
  }

  if (result.bookmarks.length > 0) {
    const label = document.createElement("p");
    label.className = "bm-section-label";
    label.textContent = "Bookmarks";
    bmList.append(label);

    for (const item of result.bookmarks) {
      bmList.append(buildBookmarkRow(item));
    }
  }
}

// Jump from a matched folder into normal folder-browse mode.
function openFolderFromSearch(folderId: string) {
  resetSearch();
  bmFolders?.classList.remove("hidden");
  selectedBmFolderId = folderTree.some((folder) => folder.id === folderId)
    ? folderId
    : "unfiled";
  renderFolderFilter();
  void loadBookmarks();
}

// Reload whichever view is active (search results or folder browse).
async function refreshCurrentView() {
  if (isSearching()) {
    await runSearch(searchQuery);
  } else {
    await loadBookmarks();
  }
}

const ICON_GLOBE =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>';
const ICON_MOVE =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a1 1 0 0 1 1-1h4l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M12 11v6M9 14l3 3 3-3"/></svg>';
const ICON_TRASH =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m1 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7"/><path d="M10 11v6M14 11v6"/></svg>';
const ICON_X =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

function iconButton(className: string, label: string, svg: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = svg;
  return button;
}

function buildBookmarkRow(item: BookmarkItem) {
  const row = document.createElement("div");
  row.className = "bm-row";

  const main = document.createElement("div");
  main.className = "bm-row-main";

  const open = document.createElement("a");
  open.className = "bm-open";
  open.href = item.url;
  open.target = "_blank";
  open.rel = "noopener noreferrer";
  open.title = `${item.title}\n${item.url}`;

  const avatar = document.createElement("span");
  avatar.className = "avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = item.title.charAt(0) || "·";

  const body = document.createElement("span");
  body.className = "bm-body";

  const title = document.createElement("span");
  title.className = "bm-title";
  title.textContent = item.title;
  // Titles clamp to one line, so the full text is only reachable on hover.
  title.title = item.title;

  const meta = document.createElement("span");
  meta.className = "bm-meta";
  const domain = document.createElement("span");
  domain.className = "bm-domain";
  domain.textContent = domainFromUrl(item.url);
  const dot = document.createElement("span");
  dot.className = "bm-dot";
  dot.setAttribute("aria-hidden", "true");
  dot.textContent = "·";
  const time = document.createElement("span");
  time.className = "bm-time";
  time.textContent = relativeTime(item.capturedAt);
  meta.append(domain, dot, time);

  if (item.visibility === "public") {
    const vis = document.createElement("span");
    vis.className = "bm-vis-inline";
    vis.title = "Public";
    vis.innerHTML = ICON_GLOBE;
    const label = document.createElement("span");
    label.className = "sr-only";
    label.textContent = "Public";
    vis.append(label);
    meta.append(vis);
  }

  // Tags used to render as a third line of chips here. They aren't filterable
  // from the popup, so they cost a row of height for no action. Folder stays,
  // inline, because search results span folders and it disambiguates them.
  if (isSearching() && item.folderName) {
    const dot2 = document.createElement("span");
    dot2.className = "bm-dot";
    dot2.setAttribute("aria-hidden", "true");
    dot2.textContent = "·";
    const folder = document.createElement("span");
    folder.className = "bm-folder-inline";
    folder.textContent = item.folderName;
    meta.append(dot2, folder);
  }

  body.append(title, meta);

  open.append(avatar, body);

  const actions = document.createElement("div");
  actions.className = "bm-actions";

  main.append(open, actions);
  row.append(main);
  renderRowActions(row, actions, item);

  return row;
}

function renderRowActions(
  row: HTMLElement,
  actions: HTMLElement,
  item: BookmarkItem,
) {
  actions.innerHTML = "";
  row.querySelector(".bm-move-bar")?.remove();

  let deleteArmed = false;
  let disarmTimer: ReturnType<typeof setTimeout> | undefined;

  const moveButton = iconButton("bm-action", "Move to folder", ICON_MOVE);
  moveButton.addEventListener("click", () => showMoveBar(row, actions, item));

  const deleteButton = iconButton(
    "bm-action bm-action-danger",
    "Delete bookmark",
    ICON_TRASH,
  );
  deleteButton.addEventListener("click", () => {
    if (!deleteArmed) {
      // First click arms; second click within the window confirms.
      deleteArmed = true;
      deleteButton.classList.add("armed");
      deleteButton.setAttribute("aria-label", "Confirm delete");
      deleteButton.title = "Click again to delete";
      disarmTimer = setTimeout(() => {
        deleteArmed = false;
        deleteButton.classList.remove("armed");
        deleteButton.setAttribute("aria-label", "Delete bookmark");
        deleteButton.title = "Delete bookmark";
      }, 3000);
      return;
    }
    if (disarmTimer) {
      clearTimeout(disarmTimer);
    }
    void performDelete(item);
  });

  actions.append(moveButton, deleteButton);
}

function showMoveBar(
  row: HTMLElement,
  actions: HTMLElement,
  item: BookmarkItem,
) {
  row.querySelector(".bm-move-bar")?.remove();

  const bar = document.createElement("div");
  bar.className = "bm-move-bar";

  // The bookmark's own current folder (works in both browse and search views).
  const currentFolderId = item.folderId ?? "unfiled";

  const select = document.createElement("select");
  select.className = "select bm-move";
  select.setAttribute("aria-label", "Move to folder");
  for (const folder of folderTree) {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = `${folder.icon || "📁"} ${folder.name}`;
    if (folder.id === currentFolderId) {
      option.selected = true;
    }
    select.append(option);
  }
  select.addEventListener("change", () => {
    const target = select.value;
    if (target && target !== currentFolderId) {
      void performMove(item, target);
    } else {
      renderRowActions(row, actions, item);
    }
  });

  const cancel = iconButton("bm-action", "Cancel move", ICON_X);
  cancel.addEventListener("click", () => renderRowActions(row, actions, item));

  bar.append(select, cancel);
  row.append(bar);
  select.focus();
}

async function performDelete(item: BookmarkItem) {
  setStatus("Deleting…", "pending");
  try {
    const response = await send({
      type: "amiro/delete-bookmark",
      bookmarkId: item.id,
    } satisfies ExtensionMessage);
    if (!response.ok) {
      throw new Error(response.error);
    }
    setStatus(`Deleted “${item.title}”.`, "success");
    await loadFolders();
    await refreshCurrentView();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete bookmark.";
    setStatus(message, "error");
  }
}

async function performMove(item: BookmarkItem, folderId: string) {
  setStatus("Moving…", "pending");
  try {
    const response = await send({
      type: "amiro/move-bookmark",
      bookmarkId: item.id,
      folderId: folderId === "unfiled" ? undefined : folderId,
    } satisfies ExtensionMessage);
    if (!response.ok) {
      throw new Error(response.error);
    }
    setStatus(`Moved “${item.title}”.`, "success");
    await loadFolders();
    await refreshCurrentView();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to move bookmark.";
    setStatus(message, "error");
  }
}

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function relativeTime(ms: number) {
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return `${weeks}w ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }
  return `${Math.floor(days / 365)}y ago`;
}

// ── Visibility segmented toggles ──────────────────────────────────
function wireSegments(
  selector: string,
  attr: "vis" | "visFolder",
  onChange: (value: Visibility) => void,
) {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(selector),
  );
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const value = button.dataset[attr] as Visibility | undefined;
      if (!value) {
        return;
      }
      for (const sibling of buttons) {
        sibling.setAttribute(
          "aria-pressed",
          sibling === button ? "true" : "false",
        );
      }
      onChange(value);
    });
  }
}

// ── Emoji picker ──────────────────────────────────────────────────
function renderEmojiGrid() {
  if (!emojiGrid) {
    return;
  }
  emojiGrid.innerHTML = "";
  for (const icon of FOLDER_ICONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "emoji";
    button.textContent = icon;
    button.setAttribute("aria-label", `Use ${icon} icon`);
    button.setAttribute(
      "aria-pressed",
      icon === selectedIcon ? "true" : "false",
    );
    button.addEventListener("click", () => {
      selectedIcon = icon;
      for (const child of Array.from(emojiGrid.children)) {
        child.setAttribute("aria-pressed", child === button ? "true" : "false");
      }
    });
    emojiGrid.append(button);
  }
}

// ── Create folder ─────────────────────────────────────────────────
function showCreateFolderPanel() {
  createFolderPanel?.classList.remove("hidden");
  createFolderToggle?.setAttribute("aria-expanded", "true");
  newFolderNameInput?.focus();
}

function hideCreateFolderPanel() {
  createFolderPanel?.classList.add("hidden");
  createFolderToggle?.setAttribute("aria-expanded", "false");
  if (newFolderNameInput) {
    newFolderNameInput.value = "";
  }
}

async function handleCreateFolder() {
  if (!createFolderButton || !newFolderNameInput) {
    return;
  }

  const name = newFolderNameInput.value.trim();
  if (!name) {
    setStatus("Folder name is required.", "error");
    newFolderNameInput.focus();
    return;
  }

  createFolderButton.disabled = true;
  setStatus("Creating folder…", "pending");

  try {
    const response = await send({
      type: "amiro/create-folder",
      name,
      icon: selectedIcon,
      visibility: folderVisibility,
    } satisfies ExtensionMessage);

    if (!response.ok || !response.folderId) {
      throw new Error(
        response.ok ? "Folder create returned no id." : response.error,
      );
    }

    await loadFolders();
    if (folderSelect) {
      folderSelect.value = response.folderId;
    }
    updateVisibilityAvailability();
    hideCreateFolderPanel();
    setStatus(`Folder “${name}” created.`, "success");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create folder.";
    setStatus(message, "error");
  } finally {
    createFolderButton.disabled = false;
  }
}

// ── Auth handshake ────────────────────────────────────────────────
async function getAuthState() {
  const response = await send({
    type: "amiro/get-auth-state",
  } satisfies ExtensionMessage);

  if (!response.ok) {
    throw new Error(response.error);
  }

  return response.session ?? null;
}

async function refreshConnectionState() {
  try {
    const session = await getAuthState();
    setConnectionState(session);
    await loadFolders();
  } catch {
    setConnectionState(null);
  }
}

async function connectSession() {
  setStatus("Opening web app handshake…", "pending");

  try {
    const response = await send({
      type: "amiro/start-handshake",
      webAppUrl: DEFAULT_WEB_APP_URL,
    } satisfies ExtensionMessage);

    if (!response.ok) {
      throw new Error(response.error);
    }

    setStatus("Complete the handshake in the opened tab.");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start handshake.";
    setStatus(message, "error");
  }
}

async function disconnectSession() {
  if (!disconnectButton) {
    return;
  }

  disconnectButton.disabled = true;

  try {
    const response = await send({
      type: "amiro/disconnect-auth",
    } satisfies ExtensionMessage);

    if (!response.ok) {
      throw new Error(response.error);
    }

    setStatus("Disconnected extension session.");
    setConnectionState(null);
    hideCreateFolderPanel();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect session.";
    setStatus(message, "error");
  } finally {
    disconnectButton.disabled = false;
  }
}

// ── Capture ───────────────────────────────────────────────────────
async function captureCurrentTab() {
  if (!captureButton) {
    return;
  }

  captureButton.disabled = true;
  setStatus("Saving current page…", "pending");

  const folderId = folderSelect?.value || undefined;

  try {
    const response = await send({
      type: "amiro/capture-current-tab",
      folderId,
      visibility: captureVisibility,
    } satisfies ExtensionMessage);

    if (!response.ok || !response.data) {
      throw new Error(
        response.ok ? "Capture returned no data." : response.error,
      );
    }

    if (response.syncStatus === "synced") {
      setStatus(`Saved “${response.data.title}”.`, "success");
      // Refresh folder counts and, if already viewing bookmarks, the list.
      await loadFolders();
      if (bookmarksInitialized) {
        await refreshCurrentView();
      }
    } else {
      const suffix = response.syncMessage ? ` ${response.syncMessage}` : "";
      setStatus(`Queued “${response.data.title}”.${suffix}`);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save current page.";
    setStatus(message, "error");
  } finally {
    captureButton.disabled = false;
  }
}

// ── Current page preview ──────────────────────────────────────────
async function loadPagePreview() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab) {
      return;
    }

    const title = tab.title?.trim() || "Untitled page";
    if (previewTitle) {
      previewTitle.textContent = title;
    }
    if (previewAvatar) {
      previewAvatar.textContent = title.charAt(0) || "·";
    }
    if (previewDomain && tab.url) {
      try {
        previewDomain.textContent = new URL(tab.url).hostname.replace(
          /^www\./,
          "",
        );
      } catch {
        previewDomain.textContent = tab.url;
      }
    }
  } catch {
    // Non-fatal — the preview is decorative.
  }
}

// ── Source label ──────────────────────────────────────────────────
function getBrowserLabel(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("vivaldi")) return "Vivaldi";
  if (ua.includes("brave")) return "Brave";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("chromium")) return "Chromium";
  if (ua.includes("chrome")) return "Chrome";
  if (ua.includes("safari")) return "Safari";
  return "Browser";
}

function getOsLabel(platform?: string) {
  if (!platform) return "Unknown OS";
  const value = platform.toLowerCase();
  if (value.includes("win")) return "Windows";
  if (value.includes("mac")) return "macOS";
  if (value.includes("linux")) return "Linux";
  if (value.includes("android")) return "Android";
  if (
    value.includes("ios") ||
    value.includes("iphone") ||
    value.includes("ipad")
  ) {
    return "iOS";
  }
  return platform;
}

async function setSourceLabel() {
  if (!sourceLabel) {
    return;
  }

  let browser = getBrowserLabel(navigator.userAgent);
  const braveNavigator = navigator as Navigator & {
    brave?: { isBrave?: () => Promise<boolean> };
  };
  if (typeof braveNavigator.brave?.isBrave === "function") {
    try {
      if (await braveNavigator.brave.isBrave()) {
        browser = "Brave";
      }
    } catch {
      // Ignore Brave detection errors and keep UA fallback.
    }
  }

  const userAgentNavigator = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform =
    userAgentNavigator.userAgentData?.platform ||
    navigator.platform ||
    "Unknown OS";
  sourceLabel.textContent = `${browser} on ${getOsLabel(platform)}`;
}

// ── Wiring ────────────────────────────────────────────────────────
wireTabs();
renderEmojiGrid();
// Capture-visibility toggle is wired directly so it can honor the public-folder
// rule (disabled state) rather than blindly flipping like the generic segments.
for (const button of captureVisButtons) {
  button.addEventListener("click", () => {
    const value = button.dataset.vis as Visibility | undefined;
    if (!value || button.disabled) {
      return;
    }
    applyCaptureVisibility(value);
  });
}
wireSegments("[data-vis-folder]", "visFolder", (value) => {
  folderVisibility = value;
});
folderSelect?.addEventListener("change", updateVisibilityAvailability);

function setTransferState(message: string) {
  if (transferState) {
    transferState.textContent = message;
  }
}

async function importBrowserBookmarks() {
  if (!importButton) {
    return;
  }

  // chrome.permissions.request only works inside a user gesture, and a
  // service worker never has one — so the prompt has to happen here, in the
  // popup, before handing the work to the background.
  let granted = false;
  try {
    granted = await chrome.permissions.request({ permissions: ["bookmarks"] });
  } catch {
    granted = false;
  }

  if (!granted) {
    setStatus("Bookmark access is needed to import.", "error");
    setTransferState("Permission declined.");
    return;
  }

  importButton.disabled = true;
  setStatus("Reading browser bookmarks…");
  setTransferState("Reading browser bookmarks…");

  try {
    const response = await send({
      type: "amiro/import-browser-bookmarks",
      strategy: importStrategy,
    });

    if (!response.ok) {
      setStatus(response.error, "error");
      setTransferState(response.error);
      return;
    }

    const summary = response.imported;
    if (!summary || summary.queued === 0) {
      setStatus("No importable bookmarks found.");
      setTransferState("No importable bookmarks found.");
      return;
    }

    const folderNote =
      summary.foldersCreated > 0
        ? `, ${summary.foldersCreated} ${
            summary.foldersCreated === 1 ? "folder" : "folders"
          } created`
        : "";
    // They sync through the normal queue, so the badge is the progress bar.
    const message = `Queued ${summary.queued} ${
      summary.queued === 1 ? "bookmark" : "bookmarks"
    }${folderNote}. Syncing in the background.`;
    setStatus(message, "success");
    setTransferState(message);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import bookmarks.";
    setStatus(message, "error");
    setTransferState(message);
  } finally {
    importButton.disabled = false;
  }
}

async function exportBookmarks() {
  if (!exportButton) {
    return;
  }

  exportButton.disabled = true;
  setStatus("Preparing export…");
  setTransferState("Preparing export…");

  let objectUrl: string | null = null;
  try {
    const response = await send({ type: "amiro/export-bookmarks" });

    if (!response.ok) {
      setStatus(response.error, "error");
      setTransferState(response.error);
      return;
    }

    const summary = response.exported;
    if (!summary) {
      setStatus("Export failed.", "error");
      return;
    }

    const blob = new Blob([summary.html], { type: "text/html" });
    objectUrl = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `amiro-bookmarks-${stamp}.html`;
    link.click();

    const message = summary.truncated
      ? `Exported the ${summary.count} most recent bookmarks (export limit reached).`
      : `Exported ${summary.count} ${
          summary.count === 1 ? "bookmark" : "bookmarks"
        }.`;
    setStatus(message, summary.truncated ? "default" : "success");
    setTransferState(message);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to export bookmarks.";
    setStatus(message, "error");
    setTransferState(message);
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    exportButton.disabled = false;
  }
}

for (const button of Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-import-strategy]"),
)) {
  button.addEventListener("click", () => {
    const value = button.dataset.importStrategy as ImportStrategy | undefined;
    if (!value) {
      return;
    }
    importStrategy = value;
    for (const sibling of Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-import-strategy]"),
    )) {
      sibling.setAttribute(
        "aria-pressed",
        sibling === button ? "true" : "false",
      );
    }
  });
}

importButton?.addEventListener("click", () => void importBrowserBookmarks());
exportButton?.addEventListener("click", () => void exportBookmarks());

connectButton?.addEventListener("click", () => void connectSession());
connectBmButton?.addEventListener("click", () => void connectSession());
disconnectButton?.addEventListener("click", () => void disconnectSession());
captureButton?.addEventListener("click", () => void captureCurrentTab());

bmSearchInput?.addEventListener("input", onSearchInput);
bmSearchInput?.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && bmSearchInput.value) {
    event.preventDefault();
    resetSearch();
    bmFolders?.classList.remove("hidden");
    void loadBookmarks();
  }
});
bmSearchClear?.addEventListener("click", () => {
  resetSearch();
  bmFolders?.classList.remove("hidden");
  bmSearchInput?.focus();
  void loadBookmarks();
});

createFolderToggle?.addEventListener("click", () => {
  if (createFolderPanel?.classList.contains("hidden")) {
    showCreateFolderPanel();
  } else {
    hideCreateFolderPanel();
  }
});
cancelCreateFolderButton?.addEventListener("click", hideCreateFolderPanel);
createFolderButton?.addEventListener("click", () => void handleCreateFolder());
newFolderNameInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void handleCreateFolder();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }
  if (changes[AUTH_SESSION_KEY]) {
    const nextSession = (changes[AUTH_SESSION_KEY].newValue ??
      null) as AuthSessionState | null;
    setConnectionState(nextSession);
    void loadFolders();
  }
  // Keep the pending list live as captures are queued or drained.
  if (changes[CAPTURE_QUEUE_KEY]) {
    void refreshPending();
  }
});

window.addEventListener("focus", () => void refreshConnectionState());

// Opening the popup is a good moment to retry any captures stranded offline.
function flushQueueOnOpen() {
  void chrome.runtime.sendMessage({
    type: "amiro/flush-queue",
  } satisfies ExtensionMessage);
}

void refreshConnectionState();
void loadPagePreview();
void setSourceLabel();
flushQueueOnOpen();
