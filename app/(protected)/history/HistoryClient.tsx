"use client";

import { useState } from "react";

import ProblemNameSearch from "@/components/ProblemNameSearch";
import type {
	SubmissionHistoryGroup,
} from "@/data/supabase/repositories/SubmissionHistoryRepo";

import SubmissionList from "@/components/SubmissionList";

import styles from "./page.module.css";

type Props = {
	groups: SubmissionHistoryGroup[];
};

export default function HistoryClient({ groups }: Props) {
	const [expandedProblems, setExpandedProblems] = useState<string[]>([]);
	const [searchResults, setSearchResults] = useState<SubmissionHistoryGroup[] | null>(null);
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
			const response = await fetch(`/api/submissions?q=${encodeURIComponent(query)}`, {
				cache: "no-store",
			});
			const body: unknown = await response.json().catch (() => null);
			if (!response.ok) {
				const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
					? body.error
					: "Unable to search submission history.";
				throw new Error(message);
			}
			setSearchResults(body as SubmissionHistoryGroup[]);
		} catch (error) {
			setSearchError(error instanceof Error ? error.message : "Unable to search submission history.");
		} finally {
			setIsSearching(false);
		}
	}

	const visibleGroups = searchResults ?? groups;
	const visibleSubmissionCount = visibleGroups.reduce(
		(total, group) => total + group.submissions.length,
		0,
	);

	function toggleProblem(problemId: string) {
		setExpandedProblems(current =>
			current.includes(problemId)
				? current.filter(id => id !== problemId)
				: [...current, problemId],
		);
	}

	return (
		<>
			<div className={styles.searchHeader}>
				<ProblemNameSearch isSearching={isSearching} error={searchError} onSearch={search} />
				<div className={styles.count}>
					<strong>{visibleSubmissionCount}</strong>
					<span>submissions</span>
				</div>
			</div>

			{isSearching ? (
				<p className={styles.loading} role="status" aria-live="polite">Searching history...</p>
			) : visibleGroups.length === 0 ? (
				<section className={styles.emptyState}>
					<div className={styles.emptyIcon} aria-hidden="true">↗</div>
					<h2>{searchResults ? "No matching submissions" : "No submissions yet"}</h2>
					<p>
						{searchResults
							? "No problems matched your search."
							: "You have not submitted any attempts to any problems."}
					</p>
				</section>
			) : (
				<div className={styles.problemList}>
					{visibleGroups.map(group => {
						const expanded = expandedProblems.includes(group.problemId);

						return (
							<article key={group.problemId} className={styles.problemCard}>
								<button
									type="button"
									className={styles.problemToggle}
									onClick={() => toggleProblem(group.problemId)}
									aria-expanded={expanded}
									aria-controls={`history-${group.problemId}`}
								>
									<div className={styles.problemText}>
										<h2>{group.problemName}</h2>
										<p>{group.problemDescription || "No description provided."}</p>
									</div>
									<div className={styles.problemSummary}>
										<span className={styles.attemptCount}>
											{group.submissions.length}{" "}
											{group.submissions.length === 1 ? "attempt" : "attempts"}
										</span>
										<span className={styles.chevron} data-expanded={expanded} aria-hidden="true">⌄</span>
									</div>
								</button>
								{expanded && (
									<div id={`history-${group.problemId}`} className={styles.submissionList}>
										<SubmissionList submissions={group.submissions} />
									</div>
								)}
							</article>
						);
					})}
				</div>
			)}
		</>
	);
}
