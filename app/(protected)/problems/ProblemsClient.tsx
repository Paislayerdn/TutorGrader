"use client";

import { useState } from "react";

import ProblemNameSearch from "@/components/ProblemNameSearch";
import type { ProblemListItem } from "@/domain/problem/ProblemRepoTypes";

import ProblemCard from "./ProblemCard";
import styles from "./page.module.css";

type Props = {
	items: ProblemListItem[];
	canManageProblems: boolean;
};

async function readError(response: Response): Promise<string> {
	const body: unknown = await response.json().catch (() => null);
	if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
		return body.error;
	}
	return "Unable to search problems.";
}

export default function ProblemsClient({ items, canManageProblems }: Props) {
	const [searchResults, setSearchResults] = useState<ProblemListItem[] | null>(null);
	const [isSearching, setIsSearching] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);

	async function search(query: string) {
		setSearchError(null);
		if (!query) {
			setSearchResults(null);
			return;
		}

		setSearchResults(null);
		setIsSearching(true);
		try {
			const response = await fetch(`/api/problems?q=${encodeURIComponent(query)}`, {
				cache: "no-store",
			});
			if (!response.ok) throw new Error(await readError(response));
			setSearchResults(await response.json() as ProblemListItem[]);
		} catch (error) {
			setSearchError(error instanceof Error ? error.message : "Unable to search problems.");
		} finally {
			setIsSearching(false);
		}
	}

	const visibleItems = searchResults ?? items;
	const draftProblems = visibleItems.filter(item => item.isDraft);
	const publishedProblems = visibleItems.filter(item => !item.isDraft);

	return (
		<>
			<div className={styles.search}>
				<ProblemNameSearch isSearching={isSearching} error={searchError} onSearch={search} />
			</div>

			{isSearching ? (
				<p className={styles.loading} role="status" aria-live="polite">Searching problems...</p>
			) : (
				<>
					{canManageProblems && draftProblems.length > 0 && (
						<section className={styles.section}>
							<h2>Drafts</h2>
							<div className={styles.list}>
								{draftProblems.map(problem => (
									<ProblemCard key={problem.id} problem={problem} canManageProblems={canManageProblems} />
								))}
							</div>
						</section>
					)}

					<section className={styles.section}>
						<h2>Published Problems</h2>
						{publishedProblems.length === 0 ? (
							<p className={styles.empty}>
								{searchResults === null || draftProblems.length > 0
									? "No published problems available."
									: "No problems matched your search."}
							</p>
						) : (
							<div className={styles.list}>
								{publishedProblems.map(problem => (
									<ProblemCard key={problem.id} problem={problem} canManageProblems={canManageProblems} />
								))}
							</div>
						)}
					</section>
				</>
			)}
		</>
	);
}
