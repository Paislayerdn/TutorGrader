import type { ExecutionFailureVerdict } from "@/domain/submission/TestVerdict";

export type ExecutionErrorKind = ExecutionFailureVerdict;

export type ExecutionError = {
	kind: ExecutionErrorKind;
	message: string;
	diagnostic: string | null;
	executionTimeMs: number | null;
	memoryUsageKb: number | null;
	output?: string;
};
