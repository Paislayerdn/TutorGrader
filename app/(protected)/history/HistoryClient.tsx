
"use client";

import { useEffect, useState } from "react";

import styles from "./page.module.css";

import type {
	SubmissionHistoryGroup,
	SubmissionHistoryItem,
} from "@/domain/submission/SubmissionHistoryRepository";

type Props = {
	groups: SubmissionHistoryGroup[];
	canViewAll: boolean;
};

function formatDate(value: string): string {
	return `${new Date(value).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}


function formatStatus(status: string): string {
	if (status === "PASS") return "Correct Output";
	if (status === "WRONG_ANSWER") return "Incorrect Output";

	return status
		.toLowerCase()
		.split("_")
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function getSubmissionLabel(status: string): string {
	return status === "COMPLETED" ? "Complete" : "Incomplete";
}


function getPassedCount(submission: SubmissionHistoryItem): number {
	return submission.testResults.filter(
		result => result.status === "PASS",
	).length;
}

export default function HistoryClient({ groups, canViewAll }: Props) {
	const [expandedProblems, setExpandedProblems] = useState<string[]>([]);
	const [selected, setSelected] =
		useState<SubmissionHistoryItem | null>(null);

	useEffect(() => {
		if (!selected) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setSelected(null);
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [selected]);

	function toggleProblem(problemId: string) {
		setExpandedProblems(current =>
			current.includes(problemId)
				? current.filter(id => id !== problemId)
				: [...current, problemId],
		);
	}

	if (groups.length === 0) {
		return (
			<section className={styles.emptyState}>
				<div className={styles.emptyIcon} aria-hidden="true">
					↗
				</div>
				<h2>No submissions yet</h2>
				<p>
					You have not submitted any attempts to any problems.
				</p>
			</section>
		);
	}

	return (
		<>
			<div className={styles.problemList}>
				{groups.map(group => {
					const expanded = expandedProblems.includes(group.problemId);

					return (
						<article
							key={group.problemId}
							className={styles.problemCard}
						>
							<button
								type="button"
								className={styles.problemToggle}
								onClick={() => toggleProblem(group.problemId)}
								aria-expanded={expanded}
								aria-controls={`history-${group.problemId}`}
							>
								<div className={styles.problemText}>
									<h2>{group.problemName}</h2>
									<p>
										{group.problemDescription ||
											"No description provided."}
									</p>
								</div>

								<div className={styles.problemSummary}>
									<span className={styles.attemptCount}>
										{group.submissions.length}{" "}
										{group.submissions.length === 1
											? "attempt"
											: "attempts"}
									</span>
									<span
										className={styles.chevron}
										data-expanded={expanded}
										aria-hidden="true"
									>
										⌄
									</span>
								</div>
							</button>

							{expanded && (
								<div
									id={`history-${group.problemId}`}
									className={styles.submissionList}
								>
									{group.submissions.map(submission => (
										<button
											type="button"
											key={submission.id}
											className={styles.submissionRow}
											onClick={() => setSelected(submission)}
										>
											<div className={styles.submissionMain}>
												<strong
													className={styles.submissionId}
													title={submission.id}
												>
													Submission #
													{submission.id.slice(0, 6)}…
												</strong>

												<span className={styles.submissionMeta}>
													{submission.languageName}
													{" · "}
													{formatDate(submission.submittedAt)}
												</span>

												{canViewAll && (
													<span className={styles.username}>
														{submission.username}
													</span>
												)}
											</div>

											<div className={styles.submissionRight}>
												<span
													className={styles.submissionStatus}
													data-status={submission.status}
												>
													{getSubmissionLabel(submission.status)}
												</span>

												{submission.testResults.length > 0 && (
													<span className={styles.testSummary}>
														{getPassedCount(submission)}/
														{submission.testResults.length} passed
													</span>
												)}
											</div>
										</button>
									))}
								</div>
							)}
						</article>
					);
				})}
			</div>

			{selected && (
				<div
					className={styles.overlay}
					role="presentation"
					onMouseDown={event => {
						if (event.target === event.currentTarget) {
							setSelected(null);
						}
					}}
				>
					<section
						className={styles.modal}
						role="dialog"
						aria-modal="true"
						aria-labelledby="submission-title"
					>
						<header className={styles.modalHeader}>
							<div>
								<p className={styles.eyebrow}>SUBMISSION DETAILS</p>
								<h2 id="submission-title" title={selected.id}>
									Submission #{selected.id.slice(0, 6)}…
								</h2>
							</div>

							<button
								type="button"
								className={styles.closeButton}
								onClick={() => setSelected(null)}
								aria-label="Close submission details"
							>
								×
							</button>
						</header>

						<div className={styles.modalBody}>
							<section className={styles.detailSection}>
								<h3>Problem</h3>
								<h4>
									{selected.problemName}
									<span className={styles.versionLine}>
										{" · "}Submitted against version {selected.versionNumber}
									</span>
								</h4>
								<p className={styles.detailDescription}>
									{selected.problemDescription ||
										"No description provided."}
								</p>
							</section>

							<section className={styles.detailSection}>
								<h3>Submission</h3>

								<span
									className={styles.submissionStatus}
									data-status={selected.status}
								>
									{getSubmissionLabel(selected.status)}
								</span>

								<dl className={styles.metadata}>
									<div>
										<dt>Language</dt>
										<dd>{selected.languageName}</dd>
									</div>
									<div>
										<dt>Submitted</dt>
										<dd>{formatDate(selected.submittedAt)}</dd>
									</div>
									<div>
										<dt>Source file</dt>
										<dd>{selected.sourceFilename}</dd>
									</div>
									{canViewAll && (
										<div>
											<dt>Submitted by</dt>
											<dd>{selected.username}</dd>
										</div>
									)}
								</dl>

								{selected.isDemoSource && (
									<p className={styles.demoNotice}>
										Demo fixture: the source file\'s metadata exists,
										but its contents have not been uploaded.
									</p>
								)}

								<button
									type="button"
									className={styles.downloadButton}
									disabled
									title="The source download endpoint is being added next."
								>
									Download Source
								</button>
							</section>

							<section className={styles.detailSection}>
								<h3>Verdict</h3>

								{selected.testResults.length === 0 ? (
									<p className={styles.noResults}>
										No per-test results have been recorded for this attempt.
									</p>
								) : (
									<div className={styles.testTable}>
										<div className={styles.testTableHeader}>
											<span>Test</span>
											<span>Result</span>
											<span>Time</span>
											<span>Memory</span>
										</div>

										{selected.testResults.map(result => (
											<div
												key={result.testCaseOrder}
												className={styles.testTableRow}
											>
												<strong>#{result.testCaseOrder}</strong>

												<span
													className={styles.submissionStatus}
													data-status={result.status}
												>
													{formatStatus(result.status)}
												</span>

												<span>
													{result.executionTimeMs == null
														? "—"
														: `${result.executionTimeMs} ms`}
												</span>

												<span>
													{result.memoryUsageKb == null
														? "—"
														: `${result.memoryUsageKb} KB`}
												</span>
											</div>
										))}
									</div>
								)}
							</section>
						</div>
					</section>
				</div>
			)}
		</>
	);
}

