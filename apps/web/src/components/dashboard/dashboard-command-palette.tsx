"use client";

import { FolderClosed } from "lucide-react";

import { Input } from "@/components/ui/input";

import type { MockFolder } from "./mock-data";

export function DashboardCommandPalette({
	open,
	query,
	onQueryChange,
	folders,
	onClose,
	onSelectFolder,
}: {
	open: boolean;
	query: string;
	onQueryChange: (query: string) => void;
	folders: MockFolder[];
	onClose: () => void;
	onSelectFolder: (folderId: string) => void;
}) {
	if (!open) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[12vh]"
			role="dialog"
			aria-modal="true"
		>
			<button
				type="button"
				aria-label="Close search"
				className="absolute inset-0 cursor-default"
				onClick={onClose}
			/>
			<div className="relative w-full max-w-xl rounded-xl border border-border bg-background shadow-xl">
				<div className="border-b p-3">
					<Input
						autoFocus
						value={query}
						onChange={(event) => onQueryChange(event.target.value)}
						placeholder="Type a folder name or tag..."
					/>
				</div>
				<div className="max-h-[360px] overflow-y-auto p-2">
					{folders.length === 0 ? (
						<p className="px-2 py-8 text-center text-muted-foreground text-sm">
							No matching folders.
						</p>
					) : (
						folders.map((folder) => (
							<button
								key={folder.id}
								type="button"
								onClick={() => onSelectFolder(folder.id)}
								className="mb-1.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-muted"
							>
								<span className="flex items-center gap-2">
									<FolderClosed className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm">{folder.name}</span>
								</span>
								<span className="text-muted-foreground text-xs">
									{folder.tags.join(" • ")}
								</span>
							</button>
						))
					)}
				</div>
			</div>
		</div>
	);
}
