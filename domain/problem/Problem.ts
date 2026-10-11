import { ProblemStatus } from "./ProblemStatus";
import { ProblemVersion } from "./version/ProblemVersion";

export class Problem {
	constructor(
		public id: number,
		public status: ProblemStatus,
		public currentVersionNumber: number | null,
		public currentDraftNumber: number | null,
		public createdById: string,
		public createdAt: Date,
		public updatedAt: Date,
		public versions: ProblemVersion[],
	) {}

	public getVersion(versionNumber: number): ProblemVersion | null {
		return this.versions.find(
			version => version.versionNumber === versionNumber,
		) ?? null;
	}
}
