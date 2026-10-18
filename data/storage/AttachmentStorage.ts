import { supabaseAdmin } from "@/data/supabase/supabase-admin";

export class AttachmentStorage {
	public async upload(
		bucket: string,
		path: string,
		file: File | ArrayBuffer,
		contentType: string,
		failureMessage: string,
	): Promise<void> {
		const { error } = await supabaseAdmin.storage
			.from(bucket)
			.upload(path, file, { contentType, upsert: false });
		if (error) {
			console.error("Storage upload error:", error);
			throw new Error(failureMessage);
		}
	}

	public async remove(bucket: string, paths: string[]): Promise<void> {
		if (paths.length === 0) return;
		const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);
		if (error) throw error;
	}

	public async download(bucket: string, path: string): Promise<Blob | null> {
		const { data, error } = await supabaseAdmin.storage
			.from(bucket)
			.download(path);
		if (error || !data) {
			console.error("Storage download error:", error);
			return null;
		}
		return data;
	}
}
