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
	private readonly _id: string;
	private readonly _fileExtension: string;
	private readonly _bucket: string;
	private readonly _storagePath: string;
	private readonly _uploadedById: string;
	private readonly _originalFilename: string | null;
	private readonly _createdAt: Date;

	constructor(data: StuffData) {
		this._id = data.id;
		this._fileExtension = data.fileExtension;
		this._bucket = data.bucket;
		this._storagePath = data.storagePath;
		this._uploadedById = data.uploadedById;
		this._originalFilename = data.originalFilename;
		this._createdAt = new Date(data.createdAt);
	}

	public get id(): string { return this._id; }
	public get fileExtension(): string { return this._fileExtension; }
	public get bucket(): string { return this._bucket; }
	public get storagePath(): string { return this._storagePath; }
	public get uploadedById(): string { return this._uploadedById; }
	public get originalFilename(): string | null {
		return this._originalFilename;
	}
	public get createdAt(): Date { return new Date(this._createdAt); }
	public get displayName(): string {
		return getStuffDisplayName(this.originalFilename, this.storagePath, "attachment");
	}
}
