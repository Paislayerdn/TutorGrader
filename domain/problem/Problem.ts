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
}
