export type StuffData = {
	id: string;
	fileExtension: string;
	bucket: string;
	storagePath: string;
	uploadedById: string;
	originalFilename: string | null;
	createdAt: Date;
};

export function getStuffDisplayName(
	originalFilename: string | null | undefined,
	storagePath: string,
	fallback: string,
): string {
	return originalFilename
		|| storagePath.replace(/\\/g, "/").split("/").pop()
		|| fallback;
}

export class Stuff {
	private readonly _createdAt: Date;

	constructor(
		public readonly id: string,
		public readonly fileExtension: string,
		public readonly bucket: string,
		public readonly storagePath: string,
		public readonly uploadedById: string,
		public readonly originalFilename: string | null,
		createdAt: Date,
	) {
		this._createdAt = new Date(createdAt);
	}

	public get createdAt(): Date { return new Date(this._createdAt); }
	public get displayName(): string {
		return getStuffDisplayName(this.originalFilename, this.storagePath, "attachment");
	}
}
