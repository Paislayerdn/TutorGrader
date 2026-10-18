import { supabaseAdmin } from "@/data/supabase/supabase-admin";

export type CreateSubmissionData = {
	userId: string;
	problemId: string;
	versionNumber: number;
	languageId: number;
	sourceStuffId: string;
};

export type SubmissionData = {
	id: string;
	userId: string;
	problemId: string;
	versionNumber: number;
	languageId: number;
	status: string;
	submittedAt: Date;
	sourceStuffId: string;
};

type SubmissionRow = {
	id: string;
	user_id: string;
	problem_id: string;
	version_number: number;
	language_id: number;
	status: string;
	submitted_at: string;
	source_stuff_id: string;
};

export class SubmissionRepo {
	async findSourceAccess(id: string): Promise<{ user_id: string; source_stuff_id: string } | null> {
		const { data, error } = await supabaseAdmin.from("submission")
			.select("user_id, source_stuff_id").eq("id", id).maybeSingle();
		if (error) throw new Error("Unable to look up the submission.");
		return data;
	}

	async create(data: CreateSubmissionData): Promise<SubmissionData> {
		const { data: row, error } = await supabaseAdmin
			.from("submission")
			.insert({
				user_id: data.userId,
				problem_id: data.problemId,
				version_number: data.versionNumber,
				language_id: data.languageId,
				source_stuff_id: data.sourceStuffId,
			})
			.select(
				"id, user_id, problem_id, version_number, language_id, status, submitted_at, source_stuff_id",
			)
			.single();

		if (error || !row) {
			console.error("Submission creation error:", error);
			throw new Error("Unable to create submission.");
		}

		const submission = row as SubmissionRow;

		return {
			id: submission.id,
			userId: submission.user_id,
			problemId: submission.problem_id,
			versionNumber: submission.version_number,
			languageId: submission.language_id,
			status: submission.status,
			submittedAt: new Date(submission.submitted_at),
			sourceStuffId: submission.source_stuff_id,
		};
	}
}
