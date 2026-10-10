import { OutputComparison } from "./OutputComparison";
import { ProblemVersionStatus } from "./ProblemVersionStatus";
import { TestCase } from "./TestCase";
import { Language } from "@/domain/language/Language";
import { Stuff } from "@/domain/stuff/Stuff";

export type ProblemVersionData = {
	problemId: number;
	versionNumber: number;
	status: ProblemVersionStatus;

	name: string;
	description: string | null;
	difficulty: string | null;

	timeLimitMs: number;
	memoryLimitKb: number;
	outputComparison: OutputComparison;

	createdAt: Date;
	publishedById: string | null;
	publishedAt: Date | null;

	languages: Language[];
	requirements: string[];
	testCases: TestCase[];	
	stuffs: Stuff[];
};

export class ProblemVersion {
	private readonly _problemId: number;
	private readonly _versionNumber: number;
	private _status: ProblemVersionStatus;

	private _name: string;
	private _description: string | null;
	private _difficulty: string | null;

	private _timeLimitMs: number;
	private _memoryLimitKb: number;
	private _outputComparison: OutputComparison;

	private readonly _createdAt: Date;
	private _publishedById: string | null;
	private _publishedAt: Date | null;

	private _languages: Language[];
	private _requirements: string[];
	private _testCases: TestCase[];
	private _stuffs: Stuff[];

	constructor(data: ProblemVersionData) {
		this._problemId = data.problemId;
		this._versionNumber = data.versionNumber;
		this._status = data.status;

		this._name = data.name;
		this._description = data.description;
		this._difficulty = data.difficulty;

		this._timeLimitMs = data.timeLimitMs;
		this._memoryLimitKb = data.memoryLimitKb;
		this._outputComparison = data.outputComparison;

		this._createdAt = new Date(data.createdAt);
		this._publishedById = data.publishedById;
		this._publishedAt = data.publishedAt
			? new Date(data.publishedAt)
			: null;

		this._languages = [...data.languages];
		this._requirements = [...data.requirements];
		this._testCases = [...data.testCases];
		this._stuffs = [...data.stuffs];

		this.validate();
	}

	public get problemId(): number { return this._problemId; }
	public get versionNumber(): number { return this._versionNumber; }
	public get status(): ProblemVersionStatus { return this._status; }

	public get name(): string { return this._name; }
	public get description(): string | null { return this._description; }
	public get difficulty(): string | null { return this._difficulty; }

	public get timeLimitMs(): number { return this._timeLimitMs; }
	public get memoryLimitKb(): number { return this._memoryLimitKb; }
	public get outputComparison(): OutputComparison { return this._outputComparison; }

	public get createdAt(): Date { return new Date(this._createdAt); }
	public get publishedById(): string | null { return this._publishedById; }
	public get publishedAt(): Date | null { return this._publishedAt ? new Date(this._publishedAt) : null; }

	public get languages(): Language[] { return [...this._languages]; }
	public get requirements(): string[] { return [...this._requirements]; }
	public get testCases(): TestCase[] { return [...this._testCases]; }
	public get stuffs(): Stuff[] { return [...this._stuffs]; }

	private validate(): void {
		if (this._versionNumber <= 0) {
			throw new Error("Version number must be positive.");
		}

		if (!Number.isSafeInteger(this._timeLimitMs) || this._timeLimitMs < 0) {
			throw new Error("Time limit must be a non-negative integer.");
		}

		if (!Number.isSafeInteger(this._memoryLimitKb) || this._memoryLimitKb < 0) {
			throw new Error("Memory limit must be a non-negative integer.");
		}

		if (
			this._status === ProblemVersionStatus.PUBLISHED
			&& (!this._publishedById || !this._publishedAt)
		) {
			throw new Error("Published versions require a publisher and publication date.");
		}

		if (
			this._status === ProblemVersionStatus.DRAFT
			&& (this._publishedById !== null || this._publishedAt !== null)
		) {
			throw new Error("Draft versions cannot have publication details.");
		}
	}

	private ensureDraft(): void {
		if (this._status !== ProblemVersionStatus.DRAFT) {
			throw new Error("Published versions cannot be modified.");
		}
	}

	public rename(name: string): void {
		this.ensureDraft();
		this._name = name;
	}

	public changeDescription(description: string | null): void {
		this.ensureDraft();
		this._description = description;
	}

	public changeDifficulty(difficulty: string | null): void {
		this.ensureDraft();
		this._difficulty = difficulty;
	}

	public changeTimeLimit(timeLimitMs: number): void {
		this.ensureDraft();

		if (timeLimitMs <= 0) {
			throw new Error("Time limit must be positive.");
		}

		this._timeLimitMs = timeLimitMs;
	}

	public changeMemoryLimit(memoryLimitKb: number): void {
		this.ensureDraft();

		if (memoryLimitKb <= 0) {
			throw new Error("Memory limit must be positive.");
		}

		this._memoryLimitKb = memoryLimitKb;
	}

	public changeOutputComparison(outputComparison: OutputComparison): void {
		this.ensureDraft();
		this._outputComparison = outputComparison;
	}

	public markPublished(publishedById: string, publishedAt: Date): void {
		this.ensureDraft();

		if (!publishedById) {
			throw new Error("Publisher is required.");
		}

		this._publishedById = publishedById;
		this._publishedAt = new Date(publishedAt);
		this._status = ProblemVersionStatus.PUBLISHED;
	}
}
