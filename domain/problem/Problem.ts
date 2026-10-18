import { ProblemStatus } from "./ProblemStatus";
import { ProblemVersion } from "./version/ProblemVersion";

export class Problem {
	constructor(
		public id: string,
		public status: ProblemStatus,
		public currentVersion: ProblemVersion | null,
		public draft: ProblemVersion | null,
		public createdById: string,
		public createdAt: Date,
		public updatedAt: Date,
	) {}

	public get currentVersionNumber(): number | null { return this.currentVersion?.versionNumber ?? null; }
	public get draftVersionNumber(): number | null { return this.draft?.versionNumber ?? null; }
	public get isPublished(): boolean { return this.currentVersion !== null; }
	public get isSubmittable(): boolean {
		return this.status === ProblemStatus.ACTIVE && this.currentVersion?.status === "PUBLISHED";
	}
	public get hasDraft(): boolean { return this.draft !== null; }
	// Preserve the established details-page behavior for inactive problems with a draft.
	public get displayVersion(): ProblemVersion | null {
		return this.status === ProblemStatus.INACTIVE && this.draft !== null
			? this.draft
			: this.currentVersion;
	}
	public get isDisplayingDraft(): boolean {
		return this.status === ProblemStatus.INACTIVE && this.draft !== null;
	}
}
