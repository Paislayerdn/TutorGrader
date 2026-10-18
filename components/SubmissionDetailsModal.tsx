"use client";

import type { SubmissionHistoryItem } from "@/data/supabase/repositories/SubmissionHistoryRepo";

import styles from "./SubmissionDetailsModal.module.css";

type Props = {
	submission: SubmissionHistoryItem;
	onClose: () => void;
};

function formatDate(value: string): string {
	return `${new Date(value)
		.toISOString()
		.slice(0, 16)
		.replace("T", " ")} UTC`;
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

function getSubmissionLabel(
	submission: SubmissionHistoryItem,
): string {
	return submission.testResults.length > 0 &&
		submission.testResults.every(result => result.status === "PASS")
		? "Complete"
		: "Incomplete";
}

export default function SubmissionDetailsModal({
	submission,
	onClose,
}: Props) {
	return (
		<div
			className={styles.overlay}
			role="presentation"
			onMouseDown={event => {
				if (event.target === event.currentTarget) {
					onClose();
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

						<h2 id="submission-title" title={submission.id}>
							Submission #{submission.id.slice(0, 6)}…
						</h2>
					</div>

					<button
						type="button"
						className={styles.closeButton}
						onClick={onClose}
						aria-label="Close submission details"
					>
						×
					</button>
				</header>

				<div className={styles.modalBody}>
					<section className={styles.detailSection}>
						<h3>Problem</h3>

						<h4>
							{submission.problemName}

							<span className={styles.versionLine}>
								{" · "}Submitted against version{" "}
								{submission.versionNumber}
							</span>
						</h4>

						<p className={styles.detailDescription}>
							{submission.problemDescription ||
								"No description provided."}
						</p>
					</section>

					<section className={styles.detailSection}>
						<h3>Submission</h3>

						<span
							className={styles.submissionStatus}
							data-status={
								getSubmissionLabel(submission) === "Complete"
									? "COMPLETED"
									: "INCOMPLETE"
							}
						>
							{getSubmissionLabel(submission)}
						</span>

						<dl className={styles.metadata}>
							<div>
								<dt>Language</dt>
								<dd>{submission.languageName}</dd>
							</div>

							<div>
								<dt>Submitted</dt>
								<dd>{formatDate(submission.submittedAt)}</dd>
							</div>

							<div>
								<dt>Source file</dt>
								<dd>{submission.sourceFilename}</dd>
							</div>
						</dl>

						{submission.isDemoSource && (
							<p className={styles.demoNotice}>
								Demo fixture: the source file&apos;s metadata exists,
								but its contents have not been uploaded.
							</p>
						)}

						{submission.isDemoSource ? (
							<button
								type="button"
								className={styles.downloadButton}
								disabled
								title="This demo source file has no uploaded contents."
							>
								Download Source
							</button>
						) : (
							<a
								href={`/api/submissions/${submission.id}/source`}
								className={styles.downloadButton}
							>
								Download Source
							</a>
						)}
					</section>

					<section className={styles.detailSection}>
						<h3>Verdict</h3>

						{submission.compileDiagnostic && (
							<section className={styles.detailSection}>
								<h3>Compiler Output</h3>
								<pre className={styles.compilerDiagnostic}>
									{submission.compileDiagnostic}
								</pre>
							</section>
						)}

						{submission.testResults.length === 0 ? (
							<p className={styles.noResults}>
								No per-test results have been recorded for this
								attempt.
							</p>
						) : (
							<div className={styles.testTable}>
								<div className={styles.testTableHeader}>
									<span>Test</span>
									<span>Result</span>
									<span>Time</span>
									<span>Memory</span>
								</div>

								{submission.testResults.map(result => (
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
	);
}
