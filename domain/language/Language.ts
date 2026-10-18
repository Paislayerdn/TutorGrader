export type LanguageData = {
	id: number;
	name: string;
	addedAt: Date;
	extensions: string[];
};

export class Language {
	private readonly _id: number;
	private readonly _name: string;
	private readonly _addedAt: Date;
	private readonly _extensions: string[];

	constructor(data: LanguageData) {
		this._id = data.id;
		this._name = data.name;
		this._addedAt = new Date(data.addedAt);
		this._extensions = [...data.extensions];
	}

	public get id(): number { return this._id; }
	public get name(): string { return this._name; }
	public get addedAt(): Date { return new Date(this._addedAt); }
	public get extensions(): string[] { return [...this._extensions]; }
	public supportsExtension(extension: string): boolean {
		return this._extensions.some(value => value.toLowerCase() === extension.toLowerCase());
	}
}
