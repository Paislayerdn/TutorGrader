import { ProblemVersion } from "./ProblemVersion";
import { ProblemStatus } from "./ProblemStatus";
import { ProblemVersionStatus } from "./ProblemVersionStatus";

export type ProblemData = {
	id: number;
	createdById: string;
	versions: ProblemVersion[];
	status: ProblemStatus;
	currentVersionNumber: number | null;
	createdAt: Date;
	updatedAt: Date;
};

export class Problem {
	private readonly _id: number;
	private readonly _createdById: string;
	private readonly _versions: Map<number, ProblemVersion>;
	private _status: ProblemStatus;
	private _currentVersionNumber: number | null;
	private readonly _createdAt: Date;
	private _updatedAt: Date;

	constructor(data: ProblemData) {
		this._id = data.id;
		this._createdById = data.createdById;
		this._versions = new Map(
			data.versions.map(version => [version.versionNumber, version]),
		);
		this._status = data.status;
		this._currentVersionNumber = data.currentVersionNumber;
		this._createdAt = new Date(data.createdAt);
		this._updatedAt = new Date(data.updatedAt);
	}

	public get id(): number { return this._id; }
	public get createdById(): string { return this._createdById; }
	public get versions(): ProblemVersion[] { return [...this._versions.values()]; }
	public get status(): ProblemStatus { return this._status; }
	public get currentVersionNumber(): number | null {
		return this._currentVersionNumber;
	}
	public get createdAt(): Date { return new Date(this._createdAt); }
	public get updatedAt(): Date { return new Date(this._updatedAt); }

	public get hasPublishedVersion(): boolean {
		return this._currentVersionNumber !== null;
	}

	public getVersion(versionNumber: number): ProblemVersion | null {
		return this._versions.get(versionNumber) ?? null;
	}

	public addVersion(version: ProblemVersion): void {
		this._versions.set(version.versionNumber, version);
	}

	public changeStatus(status: ProblemStatus): void {
		this._status = status;
	}

	public setCurrentVersion(versionNumber: number): void {
		const version = this._versions.get(versionNumber);

		if (!version || version.status !== ProblemVersionStatus.PUBLISHED) {
			throw new Error("Current version must be an existing published version.");
		}

		this._currentVersionNumber = versionNumber;
	}

	public recordUpdate(updatedAt: Date): void {
		this._updatedAt = new Date(updatedAt);
	}
}
