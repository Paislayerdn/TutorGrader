import { supabaseAdmin } from "@/lib/supabase-admin";

import { Language, type LanguageData } from "./Language";

type LanguageRow = {
	id: number;
	name: string;
	added_at: string;
};

type LanguageExtensionRow = {
	language_id: number;
	extension: string;
};

export class LanguageRepository {
	async findAll(): Promise<Language[]> {
		const { data: languageRows, error: languageError } =
			await supabaseAdmin
				.from("language")
				.select("id, name, added_at")
				.order("name", { ascending: true });

		if (languageError) {
			console.error("Language lookup error:", languageError);
			throw new Error("Unable to load languages.");
		}

		const { data: extensionRows, error: extensionError } =
			await supabaseAdmin
				.from("language_file_extension")
				.select("language_id, extension");

		if (extensionError) {
			console.error("Language extension lookup error:", extensionError);
			throw new Error("Unable to load language extensions.");
		}

		const extensionsByLanguage = new Map<number, string[]>();

		for (const row of extensionRows as LanguageExtensionRow[]) {
			const extensions =
				extensionsByLanguage.get(row.language_id) ?? [];

			extensions.push(row.extension);
			extensionsByLanguage.set(row.language_id, extensions);
		}

		return (languageRows as LanguageRow[]).map((row) => {
			const data: LanguageData = {
				id: row.id,
				name: row.name,
				addedAt: new Date(row.added_at),
				extensions: extensionsByLanguage.get(row.id) ?? [],
			};

			return new Language(data);
		});
	}
}
