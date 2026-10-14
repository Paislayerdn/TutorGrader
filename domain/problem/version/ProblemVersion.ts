import { OutputComparison } from "./OutputComparison";
import { ProblemVersionStatus } from "./ProblemVersionStatus";
import { Language } from "@/domain/language/Language";
import { Stuff } from "@/domain/stuff/Stuff";

export class ProblemVersion {
	constructor(
		public problemId: string,
		public versionNumber: number,
		public status: ProblemVersionStatus,

		public name: string,
		public description: string | null,
		public difficulty: string | null,

		public timeLimitMs: number,
		public memoryLimitKb: number,
		public outputComparison: OutputComparison,

		public createdAt: Date,
		public publishedById: string | null,
		public publishedAt: Date | null,

		public languages: Language[],
		public requirements: string[],
		public stuffs: Stuff[],
	) {}
}
