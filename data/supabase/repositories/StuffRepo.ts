import { supabaseAdmin } from "@/data/supabase/supabase-admin";

import { Stuff, type StuffData } from "@/domain/stuff/Stuff";

export type CreateStuffData = {
	id: string;
	fileExtension: string;
	bucket: string;
	storagePath: string;
	uploadedById: string;
	originalFilename?: string | null;
};

type StuffRow = {
	id: string;
	file_extension: string;
	bucket: string;
	storage_path: string;
	uploaded_by: string;
	original_filename: string | null;
	created_at: string;
};

export class StuffRepo {
	async findProblemAccess(stuffId: string): Promise<{
		problem_id: string; version_number: number;
		problem_version: { problem: { status: string; current_version_number: number | null; current_draft_number: number | null } };
	}[]> {
		const { data, error } = await supabaseAdmin.from("problem_version_stuff")
			.select("problem_id, version_number, problem_version!inner(problem!problem_version_problem_id_fkey!inner(status, current_version_number, current_draft_number))")
			.eq("stuff_id", stuffId);
		if (error) {
			console.error("Attachment association lookup error:", error);
			throw new Error("Unable to verify attachment access.");
		}
		return (data ?? []) as unknown as {
			problem_id: string; version_number: number;
			problem_version: { problem: { status: string; current_version_number: number | null; current_draft_number: number | null } };
		}[];
	}

	private static readonly STUFF_COLUMNS =
		"id, file_extension, bucket, storage_path, uploaded_by, original_filename, created_at";

	async findById(id: string): Promise<Stuff | null> {
		const { data, error } = await supabaseAdmin
			.from("stuff")
			.select(StuffRepo.STUFF_COLUMNS)
			.eq("id", id)
			.maybeSingle();

		if (error) {
			console.error("Stuff lookup error:", error);
			throw new Error("Unable to load file metadata.");
		}

		if (!data) return null;

		return this.toStuff(data as StuffRow);
	}

	async findByIds(ids: string[]): Promise<Stuff[]> {
		if (ids.length === 0) return [];
		const { data, error } = await supabaseAdmin
			.from("stuff")
			.select(StuffRepo.STUFF_COLUMNS)
			.in("id", ids);
		if (error) {
			console.error("Stuff lookup error:", error);
			throw new Error("Unable to load file metadata.");
		}
		const byId = new Map((data as StuffRow[]).map(row => [row.id, this.toStuff(row)]));
		return ids.flatMap(id => {
			const stuff = byId.get(id);
			return stuff ? [stuff] : [];
		});
	}

	private toStuff(row: StuffRow): Stuff {
		const stuffData: StuffData = {
			id: row.id,
			fileExtension: row.file_extension,
			bucket: row.bucket,
			storagePath: row.storage_path,
			uploadedById: row.uploaded_by,
			originalFilename: row.original_filename,
			createdAt: new Date(row.created_at),
		};
		return new Stuff(
			stuffData.id, stuffData.fileExtension, stuffData.bucket,
			stuffData.storagePath, stuffData.uploadedById,
			stuffData.originalFilename, stuffData.createdAt,
		);
	}

	async createMany(stuffs: CreateStuffData[]): Promise<void> {
		if (stuffs.length === 0) return;

		const { error } = await supabaseAdmin
			.from("stuff")
			.insert(stuffs.map(stuff => ({
				id: stuff.id,
				file_extension: stuff.fileExtension,
				bucket: stuff.bucket,
				storage_path: stuff.storagePath,
				uploaded_by: stuff.uploadedById,
				original_filename: stuff.originalFilename ?? null,
			})));

		if (error) {
			console.error("Stuff creation error:", error);
			throw new Error("Unable to save file metadata.");
		}
	}

	async deleteByIds(ids: string[]): Promise<void> {
		if (ids.length === 0) return;

		const { error } = await supabaseAdmin
			.from("stuff")
			.delete()
			.in("id", ids);

		if (error) {
			console.error("Stuff cleanup error:", error);
			throw new Error("Unable to clean up file metadata.");
		}
	}
}
