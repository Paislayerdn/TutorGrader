import type { OutputComparison } from "./version/OutputComparison";
import type { ProblemStatus } from "./ProblemStatus";

export type CreateProblemDraftData = {
	createdById: string;
	name: string;
	description: string | null;
	difficulty: string | null;
	timeLimitMs: number;
	memoryLimitKb: number;
	outputComparison: OutputComparison;
	languageIds: number[];
	testCases: { input: string; expectedOutput: string }[];
	stuffIds?: string[];
};

export type ProblemListItem = {
	id: string;
	problemNumber: number;
	status: ProblemStatus;
	versionNumber: number;
	draftVersionNumber: number | null;
	name: string;
	difficulty: string | null;
	isDraft: boolean;
};

export type ProblemStatusInfo = {
	id: string;
	status: ProblemStatus;
	currentVersionNumber: number | null;
	draftVersionNumber: number | null;
};
