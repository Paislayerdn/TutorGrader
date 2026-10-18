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

		const row = data as StuffRow;
		const stuffData: StuffData = {
			id: row.id,
			fileExtension: row.file_extension,
			bucket: row.bucket,
			storagePath: row.storage_path,
			uploadedById: row.uploaded_by,
			originalFilename: row.original_filename,
			createdAt: new Date(row.created_at),
		};

		return new Stuff(stuffData);
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
