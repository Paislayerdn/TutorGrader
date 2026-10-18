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
		public stuffs: Stuff[],
	) {}

	public languageForExtension(extension: string):
		| { kind: "found"; language: Language }
		| { kind: "none" }
		| { kind: "ambiguous" } {
		const matches = this.languages.filter(language => language.supportsExtension(extension));
		if (matches.length === 0) return { kind: "none" };
		if (matches.length > 1) return { kind: "ambiguous" };
		return { kind: "found", language: matches[0] };
	}
}
