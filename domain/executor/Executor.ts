import type { CompilationRequest } from "./CompilationRequest";
import type { ExecutionRequest } from "./ExecutionRequest";
import type { ExecutionResult } from "./ExecutionResult";

export interface Executor {
	compile(request: CompilationRequest): Promise<ExecutionResult>;
	execute(request: ExecutionRequest): Promise<ExecutionResult>;
}
