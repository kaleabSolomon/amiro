"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { DashboardFolder, DashboardSearchBookmark } from "./types";

interface CommandPaletteState {
  open: boolean;
  query: string;
  loading: boolean;
  folders: DashboardFolder[];
  bookmarks: DashboardSearchBookmark[];
  setOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  onSelectFolder: (folderId: string) => void;
  onOpenBookmark: (url: string) => void;
}

interface DashboardContextValue {
  selectedFolderId: string;
  selectFolder: (folderId: string) => void;
  folders: DashboardFolder[];
  foldersLoading: boolean;
  commandPalette: CommandPaletteState;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedFolderId, setSelectedFolderId] = useState("unfiled");
  const foldersQuery = useQuery(api.dashboard.getFolderTree);
  const foldersLoading = foldersQuery === undefined;

  const folders = useMemo<DashboardFolder[]>(() => {
    if (!foldersQuery || foldersQuery.length === 0) {
      return [
        {
          id: "unfiled",
          name: "Unfiled",
          icon: "📥",
          parentId: null,
          tags: [],
          itemCount: 0,
          updatedAtMs: null,
        },
      ];
    }

    return foldersQuery;
  }, [foldersQuery]);

  const folderMap = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  // Auto-correct if selected folder no longer exists
  useEffect(() => {
    if (!folderMap.has(selectedFolderId) && folders.length > 0) {
      setSelectedFolderId(folders[0].id);
    }
  }, [folderMap, folders, selectedFolderId]);

  const selectFolder = useCallback((folderId: string) => {
    setSelectedFolderId(folderId);
  }, []);

  // ─── Command palette state ────────────────────────────────
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const trimmedSearchQuery = searchQuery.trim();

  const searchResults = useQuery(
    api.dashboard.searchWorkspace,
    paletteOpen && trimmedSearchQuery
      ? { query: trimmedSearchQuery, limit: 30 }
      : "skip",
  );

  const paletteFolders = useMemo(() => {
    if (!trimmedSearchQuery) {
      return folders;
    }
    if (!searchResults) {
      return [];
    }
    return searchResults.folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      parentId: null,
      tags: [],
      itemCount: 0,
      updatedAtMs: null,
    }));
  }, [trimmedSearchQuery, folders, searchResults]);

  const paletteBookmarks = useMemo<DashboardSearchBookmark[]>(() => {
    if (!trimmedSearchQuery || !searchResults) {
      return [];
    }
    return searchResults.bookmarks;
  }, [trimmedSearchQuery, searchResults]);

  const handlePaletteSelectFolder = useCallback(
    (folderId: string) => {
      selectFolder(folderId);
      setPaletteOpen(false);
      setSearchQuery("");
    },
    [selectFolder],
  );

  const handleOpenBookmark = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    setPaletteOpen(false);
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key === "k";
      if (isShortcut) {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const commandPalette = useMemo<CommandPaletteState>(
    () => ({
      open: paletteOpen,
      query: searchQuery,
      loading: Boolean(trimmedSearchQuery) && searchResults === undefined,
      folders: paletteFolders,
      bookmarks: paletteBookmarks,
      setOpen: setPaletteOpen,
      setQuery: setSearchQuery,
      onSelectFolder: handlePaletteSelectFolder,
      onOpenBookmark: handleOpenBookmark,
    }),
    [
      paletteOpen,
      searchQuery,
      trimmedSearchQuery,
      searchResults,
      paletteFolders,
      paletteBookmarks,
      handlePaletteSelectFolder,
      handleOpenBookmark,
    ],
  );

  const value = useMemo<DashboardContextValue>(
    () => ({
      selectedFolderId,
      selectFolder,
      folders,
      foldersLoading,
      commandPalette,
    }),
    [selectedFolderId, selectFolder, folders, foldersLoading, commandPalette],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
