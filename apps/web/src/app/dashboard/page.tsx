"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DashboardCommandPalette } from "@/components/dashboard/dashboard-command-palette";
import { DashboardFolderSidebar } from "@/components/dashboard/dashboard-folder-sidebar";
import { DashboardMainPanel } from "@/components/dashboard/dashboard-main-panel";
import { MOCK_FOLDERS } from "@/components/dashboard/mock-data";
import { AppShell } from "@/components/layout/app-shell";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

function RedirectToAuth() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/auth");
	}, [router]);

	return null;
}

function FolderWorkspace() {
	const [selectedFolderId, setSelectedFolderId] = useState("inbox");
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const folderMap = useMemo(
		() => new Map(MOCK_FOLDERS.map((folder) => [folder.id, folder])),
		[],
	);

	const selectedFolder = folderMap.get(selectedFolderId) ?? MOCK_FOLDERS[0];

	const breadcrumbs = useMemo(() => {
		const path = [] as typeof MOCK_FOLDERS;
		let current: (typeof MOCK_FOLDERS)[number] | undefined = selectedFolder;

		while (current) {
			path.unshift(current);
			current = current.parentId ? folderMap.get(current.parentId) : undefined;
		}

		return path;
	}, [folderMap, selectedFolder]);

	const childFolders = useMemo(
		() =>
			MOCK_FOLDERS.filter((folder) => folder.parentId === selectedFolder.id),
		[selectedFolder.id],
	);

	const filteredFolders = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) {
			return MOCK_FOLDERS;
		}

		return MOCK_FOLDERS.filter((folder) => {
			return (
				folder.name.toLowerCase().includes(query) ||
				folder.tags.some((tag) => tag.toLowerCase().includes(query))
			);
		});
	}, [searchQuery]);

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

	const selectFolder = (folderId: string) => {
		setSelectedFolderId(folderId);
		setPaletteOpen(false);
		setSearchQuery("");
	};

	return (
		<section className="mx-auto w-full max-w-6xl px-6 py-8">
			<SidebarProvider>
				<DashboardFolderSidebar
					folders={MOCK_FOLDERS}
					selectedFolderId={selectedFolder.id}
					onSelectFolder={selectFolder}
				/>

				<SidebarInset>
					<DashboardMainPanel
						selectedFolder={selectedFolder}
						breadcrumbs={breadcrumbs}
						childFolders={childFolders}
						onSelectFolder={selectFolder}
						onOpenSearch={() => setPaletteOpen(true)}
					/>
				</SidebarInset>

				<DashboardCommandPalette
					open={paletteOpen}
					query={searchQuery}
					onQueryChange={setSearchQuery}
					folders={filteredFolders}
					onClose={() => setPaletteOpen(false)}
					onSelectFolder={selectFolder}
				/>
			</SidebarProvider>
		</section>
	);
}

export default function DashboardPage() {
	return (
		<>
			<Authenticated>
				<AppShell>
					<FolderWorkspace />
				</AppShell>
			</Authenticated>
			<Unauthenticated>
				<RedirectToAuth />
			</Unauthenticated>
			<AuthLoading>
				<div className="flex min-h-svh items-center justify-center">
					<div className="text-muted-foreground text-sm">Loading...</div>
				</div>
			</AuthLoading>
		</>
	);
}
