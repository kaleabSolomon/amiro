export type MockFolder = {
	id: string;
	name: string;
	parentId: string | null;
	tags: string[];
	itemCount: number;
	updatedAt: string;
};

export const MOCK_FOLDERS: MockFolder[] = [
	{
		id: "inbox",
		name: "Inbox",
		parentId: null,
		tags: ["daily", "fresh"],
		itemCount: 27,
		updatedAt: "2h ago",
	},
	{
		id: "research",
		name: "Research",
		parentId: null,
		tags: ["deep-work", "long-read"],
		itemCount: 48,
		updatedAt: "1d ago",
	},
	{
		id: "product",
		name: "Product Ideas",
		parentId: null,
		tags: ["startup", "roadmap"],
		itemCount: 19,
		updatedAt: "5h ago",
	},
	{
		id: "research-ai",
		name: "AI Notes",
		parentId: "research",
		tags: ["ai", "llm"],
		itemCount: 22,
		updatedAt: "3h ago",
	},
	{
		id: "research-design",
		name: "Design Systems",
		parentId: "research",
		tags: ["ui", "ux"],
		itemCount: 11,
		updatedAt: "7h ago",
	},
	{
		id: "product-growth",
		name: "Growth Loops",
		parentId: "product",
		tags: ["growth", "experiments"],
		itemCount: 9,
		updatedAt: "1d ago",
	},
	{
		id: "product-pricing",
		name: "Pricing",
		parentId: "product",
		tags: ["pricing", "saas"],
		itemCount: 6,
		updatedAt: "3d ago",
	},
];
