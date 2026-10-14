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

type DeletedDraftStuff = {
	bucket: string;
	storage_path: string;
};

type ProblemRow = {
	id: string;
	status: "ACTIVE" | "FIXING" | "INACTIVE";
	current_version_number: number | null;
	current_draft_number: number | null;
	created_at: string;
	updated_at: string;
	created_by: string;
};

export type ProblemListItem = {
	id: string;
	problemNumber: number;
	status: ProblemStatus;
	versionNumber: number;
	name: string;
	difficulty: string | null;
	isDraft: boolean;
};

type ProblemListViewRow = {
	id: string;
	problem_number: number;
	status: ProblemStatus;
	current_version_number: number;
	name: string;
	difficulty: string | null;
};

type DraftListRow = {
	id: string;
	current_draft_number: number;
};

type DraftVersionListRow = {
	problem_id: string;
	version_number: number;
	name: string;
	difficulty: string | null;
};

export class ProblemRepository {
	private static readonly PROBLEM_COLUMNS =
		"id, status, current_version_number, current_draft_number, created_at, updated_at, created_by";

	private readonly problemVersionRepository = new ProblemVersionRepository();

	async createDraft(
		data: CreateProblemDraftData,
	): Promise<{ problemId: string; versionNumber: number }> {
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
			console.error("Problem draft creation RPC failed:", error);
			throw new Error(
				`Unable to create problem draft: ${error.message} (code: ${error.code})`,
			);
		}

		const created = result?.[0];

		if (
			!created
			|| typeof created.problem_id !== "string"
			|| typeof created.version_number !== "number"
		) {
			throw new Error("Problem draft creation returned invalid data.");
		}

		return {
			problemId: created.problem_id,
			versionNumber: created.version_number,
		};
	}

	async openDraftForEditing(problemId: string): Promise<import("./version/ProblemVersion").ProblemVersion> {
		const { data, error } = await supabaseAdmin.rpc(
			"create_problem_edit_draft",
			{
				p_problem_id: problemId,
			},
		);

		if (error) {
			console.error("Problem edit draft RPC failed:", error);
			throw new Error("Unable to open the problem draft.");
		}

		const result = data?.[0];

		if (
			!result
			|| result.problem_id !== problemId
			|| typeof result.version_number !== "number"
		) {
			throw new Error("Problem edit draft RPC returned invalid data.");
		}

		const draft = await this.problemVersionRepository.findProblemVersion(
			problemId,
			result.version_number,
		);

		if (!draft || draft.status !== "DRAFT") {
			throw new Error("Unable to load the problem draft.");
		}

		return draft;
	}

	async deleteDraft(id: string): Promise<DeletedDraftStuff[]> {
		const { data, error } = await supabaseAdmin.rpc(
			"delete_problem_draft",
			{ p_problem_id: id },
		);

		if (error) {
			console.error("Problem draft deletion RPC failed:", error);
			throw new Error("Unable to delete problem draft.");
		}

		return (data ?? []) as DeletedDraftStuff[];
	}

	async findAllForListing(
		canViewInactive: boolean,
	): Promise<ProblemListItem[]> {
		const { data: activeRows, error: activeError } =
			await supabaseAdmin
				.from("problem_list_view")
				.select(
					"id, problem_number, status, current_version_number, name, difficulty",
				)
				.in("status", ["ACTIVE", "FIXING"])
				.order("problem_number", { ascending: true });

		if (activeError) {
			console.error("Active problem list lookup error:", activeError);
			throw new Error("Unable to load problems.");
		}

		const publishedRows = [
			...((activeRows ?? []) as ProblemListViewRow[]),
		];

		if (canViewInactive) {
			const { data: inactiveRows, error: inactiveError } =
				await supabaseAdmin
					.from("problem_list_view")
					.select(
						"id, problem_number, status, current_version_number, name, difficulty",
					)
					.eq("status", "INACTIVE")
					.order("problem_number", { ascending: true });

			if (inactiveError) {
				console.error(
					"Inactive problem list lookup error:",
					inactiveError,
				);
				throw new Error("Unable to load inactive problems.");
			}

			publishedRows.push(
				...((inactiveRows ?? []) as ProblemListViewRow[]),
			);
		}

		const items: ProblemListItem[] = publishedRows.map(row => ({
			id: row.id,
			problemNumber: row.problem_number,
			status: row.status,
			versionNumber: row.current_version_number,
			name: row.name,
			difficulty: row.difficulty,
			isDraft: false,
		}));

		if (!canViewInactive) {
			return items.sort((a, b) => a.problemNumber - b.problemNumber);
		}

		const { data: draftProblems, error: draftError } =
			await supabaseAdmin
				.from("problem")
				.select("id, current_draft_number")
				.is("current_version_number", null)
				.not("current_draft_number", "is", null);

		if (draftError) {
			console.error("Draft problem list lookup error:", draftError);
			throw new Error("Unable to load draft problems.");
		}

		const drafts = (draftProblems ?? []) as DraftListRow[];

		if (drafts.length === 0) {
			return items.sort((a, b) => a.problemNumber - b.problemNumber);
		}

		const { data: draftVersions, error: versionError } =
			await supabaseAdmin
				.from("problem_version")
				.select(
					"problem_id, version_number, name, difficulty",
				)
				.in("problem_id", drafts.map(draft => draft.id))
				.eq("status", "DRAFT");

		if (versionError) {
			console.error("Draft version list lookup error:", versionError);
			throw new Error("Unable to load draft summaries.");
		}

		const versions = (draftVersions ?? []) as DraftVersionListRow[];
		const draftVersionByProblem = new Map(
			versions.map(version => [
				`${version.problem_id}:${version.version_number}`,
				version,
			]),
		);

		for (const draft of drafts) {
			const version = draftVersionByProblem.get(
				`${draft.id}:${draft.current_draft_number}`,
			);

			if (!version) continue;

			items.push({
				id: draft.id,
				problemNumber: 0,
				status: ProblemStatus.INACTIVE,
				versionNumber: version.version_number,
				name: version.name,
				difficulty: version.difficulty,
				isDraft: true,
			});
		}

		return items.sort((a, b) => a.problemNumber - b.problemNumber);
	}

	async findById(id: string): Promise<Problem | null> {
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
			.order("created_at", { ascending: true });

		if (error) {
			console.error("Problem list lookup error:", error);
			throw new Error("Unable to load problems.");
		}

		return Promise.all(
			(data as ProblemRow[]).map(row => this.createProblem(row)),
		);
	}

	private async createProblem(row: ProblemRow): Promise<Problem> {
		const currentVersion = row.current_version_number === null
			? null
			: await this.problemVersionRepository.findProblemVersion(
				row.id,
				row.current_version_number,
			);

		const draft = row.current_draft_number === null
			? null
			: await this.problemVersionRepository.findProblemVersion(
				row.id,
				row.current_draft_number,
			);

		return new Problem(
			row.id,
			row.status as ProblemStatus,
			currentVersion,
			draft,
			row.created_by,
			new Date(row.created_at),
			new Date(row.updated_at),
		);
	}

	async updateStatus(id: string, status: ProblemStatus): Promise<void> {
		const { error } = await supabaseAdmin
			.from("problem")
			.update({ status })
			.eq("id", id);

		if (error) {
			console.error("Problem status update error:", error);
			throw new Error("Unable to update problem status.");
		}
	}
}
