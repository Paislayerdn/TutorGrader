import { supabaseAdmin } from "@/data/supabase/supabase-admin";

export type ExecutorRow = {
	id: number;
	code: string;
	name: string;
	priority: number;
};

export type ExecutorLanguageRow = {
	executor_id: number;
	language_id: number;
	compiler_id: string;
	runtime_version: string;
	enabled: boolean;
	is_default: boolean;
};

export class ExecutorRepo {
	async findEnabledExecutors(): Promise<ExecutorRow[]> {
		const { data, error } = await supabaseAdmin
			.from("executor")
			.select("id, code, name, priority")
			.eq("enabled", true)
			.order("priority", { ascending: true });

		if (error) {
			console.error("Executor registry lookup failed:", error);
			throw new Error("Unable to load execution providers.");
		}

		return (data ?? []) as ExecutorRow[];
	}

	async findDefaultMappingsForLanguage(
		languageId: number,
	): Promise<ExecutorLanguageRow[]> {
		const { data, error } = await supabaseAdmin
			.from("executor_language")
			.select(
				"executor_id, language_id, compiler_id, runtime_version, enabled, is_default",
			)
			.eq("language_id", languageId)
			.eq("enabled", true)
			.eq("is_default", true);

		if (error) {
			console.error("Executor mapping lookup failed:", error);
			throw new Error("Unable to load execution capabilities.");
		}

		return (data ?? []) as ExecutorLanguageRow[];
	}
}
