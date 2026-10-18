import { supabaseAdmin } from "@/data/supabase/supabase-admin";

import { Language, type LanguageData } from "@/domain/language/Language";

type LanguageRow = {
	id: number;
	name: string;
	added_at: string;
};

type LanguageExtensionRow = {
	language_id: number;
	extension: string;
};

export class LanguageRepo {
	private static readonly CACHE_TTL_MS = 30_000;
	private static cache: { expiresAt: number; languages: Language[] } | null = null;
	private static pending: Promise<Language[]> | null = null;

	async findAll(): Promise<Language[]> {
		if (LanguageRepo.cache && LanguageRepo.cache.expiresAt > Date.now()) {
			return LanguageRepo.cache.languages;
		}
		if (LanguageRepo.pending) return LanguageRepo.pending;

		LanguageRepo.pending = this.loadAll().then(languages => {
			LanguageRepo.cache = {
				expiresAt: Date.now() + LanguageRepo.CACHE_TTL_MS,
				languages,
			};
			return languages;
		}).finally(() => {
			LanguageRepo.pending = null;
		});
		return LanguageRepo.pending;
	}

	private async loadAll(): Promise<Language[]> {
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
