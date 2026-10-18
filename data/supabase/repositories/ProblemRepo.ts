
import { supabaseAdmin } from "@/data/supabase/supabase-admin";

import { ProblemVersionRepo } from "@/data/supabase/repositories/ProblemVersionRepo";
import { Problem } from "@/domain/problem/Problem";
import { ProblemVersion } from "@/domain/problem/version/ProblemVersion";
import { ProblemStatus } from "@/domain/problem/ProblemStatus";
import type { CreateProblemDraftData, ProblemListItem, ProblemStatusInfo } from "@/domain/problem/ProblemRepoTypes";

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

type PublishedDraftRow = {
	id: string;
	current_draft_number: number;
};

export class ProblemRepo {
	private static readonly PROBLEM_COLUMNS =
		"id, status, current_version_number, current_draft_number, created_at, updated_at, created_by";

	private readonly problemVersionRepo = new ProblemVersionRepo();

	async saveDraft(data: {
		problemId: string; versionNumber: number; name: string; description: string | null;
		difficulty: string | null; timeLimitMs: number; memoryLimitKb: number;
		outputComparison: string; languageIds: number[];
		testCases: { input: string; expectedOutput: string }[]; stuffIds: string[];
	}): Promise<DeletedDraftStuff[]> {
		const { data: removedFiles, error } = await supabaseAdmin.rpc("save_problem_draft", {
			p_problem_id: data.problemId, p_version_number: data.versionNumber,
			p_name: data.name, p_description: data.description, p_difficulty: data.difficulty,
			p_time_limit_ms: data.timeLimitMs, p_memory_limit_kb: data.memoryLimitKb,
			p_output_comparison: data.outputComparison, p_language_ids: data.languageIds,
			// save_problem_draft uses expectedOutput; create_problem_draft uses expected_output.
			p_test_cases: data.testCases.map(testCase => ({ input: testCase.input, expectedOutput: testCase.expectedOutput })),
			p_stuff_ids: data.stuffIds,
		});
		if (error) {
			console.error("Problem draft save RPC failed:", error);
			throw new Error("Unable to save the problem draft.");
		}
		return (removedFiles ?? []) as DeletedDraftStuff[];
	}

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
			// create_problem_draft uses snake_case; save_problem_draft uses camelCase.
			p_test_cases: data.testCases.map(testCase => ({
					input: testCase.input,
					expected_output: testCase.expectedOutput,
				})),
				p_stuff_ids: data.stuffIds ?? [],
			},
		);

		if (error) {
			console.error("Problem draft creation RPC failed:", error);
			throw new Error("Unable to create problem draft.");
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

	async openDraftForEditing(
		problemId: string,
	): Promise<ProblemVersion> {
		// This RPC intentionally remains on GET to preserve the existing editor flow.
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

		const draft = await this.problemVersionRepo.findProblemVersion(
			problemId,
			result.version_number,
		);

		if (!draft || draft.status !== "DRAFT") {
			throw new Error("Unable to load the problem draft.");
		}

		return draft;
	}

	async findDraftTestCases(problemId: string, versionNumber: number): Promise<{
		input: string;
		expectedOutput: string;
	}[]> {
		const { data, error } = await supabaseAdmin
			.from("problem_version_test_case")
			.select(`test_case ( input, expected_output )`)
			.eq("problem_id", problemId)
			.eq("version_number", versionNumber)
			.order("order", { ascending: true });
		if (error) {
			console.error("Draft test case lookup error:", error);
			throw new Error("Unable to load draft test cases.");
		}
		return ((data ?? []) as Array<{
			test_case: { input: string; expected_output: string } | { input: string; expected_output: string }[] | null;
		}>).flatMap(row => {
			if (!row.test_case) return [];
			const cases = Array.isArray(row.test_case) ? row.test_case : [row.test_case];
			return cases.map(testCase => ({
				input: testCase.input,
				expectedOutput: testCase.expected_output,
			}));
		});
	}

	async publishDraft(problemId: string, publishedById: string): Promise<{
		problemId: string;
		versionNumber: number;
	} | null> {
		const { data, error } = await supabaseAdmin.rpc("publish_problem_draft", {
			p_problem_id: problemId,
			p_published_by: publishedById,
		});
		if (error) {
			console.error("Problem publishing error:", error);
			throw new Error("Unable to publish the problem.");
		}
		const published = data?.[0];
		if (!published || published.problem_id !== problemId || typeof published.version_number !== "number") {
			return null;
		}
		return { problemId, versionNumber: published.version_number };
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
			draftVersionNumber: null,
			name: row.name,
			difficulty: row.difficulty,
			isDraft: false,
		}));

		// Regular users never receive draft version numbers.
		if (!canViewInactive) {
			return items.sort((a, b) => a.problemNumber - b.problemNumber);
		}

		// Find drafts belonging to problems that already have a published version.
		const publishedIds = items.map(item => item.id);

		if (publishedIds.length > 0) {
			const { data: publishedDrafts, error: publishedDraftError } =
				await supabaseAdmin
					.from("problem")
					.select("id, current_draft_number")
					.in("id", publishedIds)
					.not("current_draft_number", "is", null);

			if (publishedDraftError) {
				console.error(
					"Published problem draft lookup error:",
					publishedDraftError,
				);
				throw new Error("Unable to load problem drafts.");
			}

			const draftNumbers = new Map(
				((publishedDrafts ?? []) as PublishedDraftRow[]).map(row => [
					row.id,
					row.current_draft_number,
				]),
			);

			for (const item of items) {
				item.draftVersionNumber = draftNumbers.get(item.id) ?? null;
			}
		}

		// Find draft-only problems for the Admin/Owner draft section.
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
				draftVersionNumber: version.version_number,
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
			.select(ProblemRepo.PROBLEM_COLUMNS)
			.eq("id", id)
			.maybeSingle();

		if (error) {
			console.error("Problem lookup error:", error);
			throw new Error("Unable to load problem.");
		}

		if (!data) return null;

		return this.createProblem(data as ProblemRow);
	}

	async findStatusInfo(id: string): Promise<ProblemStatusInfo | null> {
		const { data, error } = await supabaseAdmin
			.from("problem")
			.select("id, status, current_version_number, current_draft_number")
			.eq("id", id)
			.maybeSingle();
		if (error) {
			console.error("Problem status lookup error:", error);
			throw new Error("Unable to load problem status.");
		}
		if (!data) return null;
		return {
			id: data.id,
			status: data.status as ProblemStatus,
			currentVersionNumber: data.current_version_number,
			draftVersionNumber: data.current_draft_number,
		};
	}

	async findAll(): Promise<Problem[]> {
		const { data, error } = await supabaseAdmin
			.from("problem")
			.select(ProblemRepo.PROBLEM_COLUMNS)
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
		const [currentVersion, draft] = await Promise.all([
			row.current_version_number === null
				? Promise.resolve(null)
				: this.problemVersionRepo.findProblemVersion(row.id, row.current_version_number),
			row.current_draft_number === null
				? Promise.resolve(null)
				: this.problemVersionRepo.findProblemVersion(row.id, row.current_draft_number),
		]);

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

