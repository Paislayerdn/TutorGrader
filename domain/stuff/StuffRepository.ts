import { supabaseAdmin } from "@/lib/supabase-admin";

import { Stuff, type StuffData } from "./Stuff";

type StuffRow = {
	id: string;
	file_extension: string;
	bucket: string;
	storage_path: string;
	uploaded_by: string;
	created_at: string;
};

export class StuffRepository {
	private static readonly STUFF_COLUMNS = "id, file_extension, bucket, storage_path, uploaded_by, created_at";

	async findById(id: string): Promise<Stuff | null> {
		const { data, error } = await supabaseAdmin
			.from("stuff")
			.select(StuffRepository.STUFF_COLUMNS)
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
			createdAt: new Date(row.created_at),
		};

		return new Stuff(stuffData);
	}
}
