import { supabaseAdmin } from "@/lib/supabase-admin";

import { Problem } from "./Problem";
import { ProblemStatus } from "./ProblemStatus";
import { ProblemVersionRepository } from "./version/ProblemVersionRepository";
import { OutputComparison } from "./version/OutputComparison";
import { TestCase } from "./TestCase";

export type CreateProblemDraftData = {
	createdById: string;
	name: string;
	description: string | null;
	difficulty: string | null;
	timeLimitMs: number;
	memoryLimitKb: number;
	outputComparison: OutputComparison;
	languageIds: number[];
	requirements: string[];
	testCases: TestCase[];
	stuffIds?: string[];
};

type ProblemRow = {
	id: number;
	status: "ACTIVE" | "FIXING" | "ARCHIVED";
	current_version_number: number | null;
	current_draft_number: number | null;
	created_at: string;
	updated_at: string;
	created_by: string;
};

export class ProblemRepository {
	private static readonly PROBLEM_COLUMNS =
		"id, status, current_version_number, current_draft_number, created_at, updated_at, created_by";

	private readonly problemVersionRepository = new ProblemVersionRepository();

	async createDraft(
		data: CreateProblemDraftData,
	): Promise<{ problemId: number; versionNumber: number }> {
		const { data: result, error } = await supabaseAdmin.rpc(
			"create_problem_draft",
			{
				p_created_by: data.createdById,
				p_name: data.name,
				p_description: data.description,
				p_difficulty: data.difficulty,
				p_time_limit_ms: data.timeLimitMs,
				p_memory_limit_kb: data.memoryLimitKb,
				p_output_comparison: data.outputComparison,
				p_language_ids: data.languageIds,
				p_requirements: data.requirements,
				p_test_cases: data.testCases.map(testCase => ({
					input: testCase.input,
					expected_output: testCase.expectedOutput,
				})),
				p_stuff_ids: data.stuffIds ?? [],
			},
		);

		if (error) {
			console.error("Problem draft creation error:", {
				code: error.code,
				message: error.message,
				details: error.details,
				hint: error.hint,
			});

			throw new Error("Unable to create problem draft.");
		}

		const created = result?.[0];

		if (
			!created
			|| typeof created.problem_id !== "number"
			|| typeof created.version_number !== "number"
		) {
			throw new Error("Problem draft creation returned invalid data.");
		}

		return {
			problemId: created.problem_id,
			versionNumber: created.version_number,
		};
	}
	
	async findById(id: number): Promise<Problem | null> {
		const { data, error } = await supabaseAdmin
			.from("problem")
			.select(ProblemRepository.PROBLEM_COLUMNS)
			.eq("id", id)
			.maybeSingle();

		if (error) {
			console.error("Problem lookup error:", error);
			throw new Error("Unable to load problem.");
		}

		if (!data) return null;

		return this.createProblem(data as ProblemRow);
	}

	async findAll(): Promise<Problem[]> {
		const { data, error } = await supabaseAdmin
			.from("problem")
			.select(ProblemRepository.PROBLEM_COLUMNS)
			.order("id", { ascending: true });

		if (error) {
			console.error("Problem list lookup error:", error);
			throw new Error("Unable to load problems.");
		}

		return Promise.all(
			(data as ProblemRow[]).map(row => this.createProblem(row)),
		);
	}

	private async createProblem(row: ProblemRow): Promise<Problem> {
		const versionNumbers = [
			row.current_version_number,
			row.current_draft_number,
		].filter((number): number is number => number !== null);

		const versions = [];

		for (const versionNumber of versionNumbers) {
			const version =
				await this.problemVersionRepository.findProblemVersion(
					row.id,
					versionNumber,
				);

			if (version) versions.push(version);
		}

		return new Problem(
			row.id,
			row.status as ProblemStatus,
			row.current_version_number,
			row.current_draft_number,
			row.created_by,
			new Date(row.created_at),
			new Date(row.updated_at),
			versions,
		);
	}
}
