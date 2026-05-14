"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { DashboardFolder } from "./types";

interface DashboardContextValue {
  selectedFolderId: string;
  selectFolder: (folderId: string) => void;
  folders: DashboardFolder[];
  foldersLoading: boolean;
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

  const selectFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
  };

  const value = useMemo<DashboardContextValue>(
    () => ({
      selectedFolderId,
      selectFolder,
      folders,
      foldersLoading,
    }),
    [selectedFolderId, folders, foldersLoading],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
