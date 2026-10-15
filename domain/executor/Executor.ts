import type { ExecutionRequest } from "./ExecutionRequest";
import type { ExecutionResult } from "./ExecutionResult";

export interface Executor {
	execute(request: ExecutionRequest): Promise<ExecutionResult>;
}

