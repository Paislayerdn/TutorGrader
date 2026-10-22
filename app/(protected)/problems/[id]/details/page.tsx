import { notFound, redirect } from "next/navigation";

import styles from "./page.module.css";

import { getCurrentVisitor } from "@/lib/auth";
import { ProblemRepo } from "@/data/supabase/repositories/ProblemRepo";
import { ProblemStatus } from "@/domain/problem/ProblemStatus";
import { SubmissionHistoryRepo } from "@/data/supabase/repositories/SubmissionHistoryRepo";
import { isUuid } from "@/lib/isUuid";

import ProblemStatusBadge from "@/components/ProblemStatusBadge";
import PublishProblemButton from "./PublishProblemButton";
import SubmitSolutionButton from "./SubmitSolutionButton";
import ProblemSubmissions from "./ProblemSubmissions";
import ProblemTestCasesButton from "./ProblemTestCasesButton";
import SubmissionStatusAutoRefresh from "./SubmissionStatusAutoRefresh";

type Props = {
	params: Promise<{
		id: string;
	}>;
};

export default async function ProblemDetailsPage({ params }: Props) {
	const user = await getCurrentVisitor();
	const { id } = await params;

	if (!isUuid(id)) {
		notFound();
	}

	const problemRepo = new ProblemRepo();
	const problem = await problemRepo.findById(id);

	if (!problem) {
		notFound();
	}

	const isAdmin = user.canManageProblems;

	const canViewAttachments = user.canDownloadProblem(problem);

	const isDraft =
		problem.currentVersionNumber === null ||
		(problem.status === ProblemStatus.INACTIVE && problem.draft !== null);

	if (!user.canViewProblem(problem)) {
		redirect("/problems");
	}

	const version = problem.displayVersion;

	if (!version) {
		notFound();
	}

	const submissionHistory =
		user.isAuthenticated &&
		problem.status === ProblemStatus.ACTIVE
			? await new SubmissionHistoryRepo().findHistory(
				user.userId!,
				problem.id,
			)
			: [];

	const submissionGroup = submissionHistory[0] ?? null;
	const hasInProgressSubmission = Boolean(
		submissionGroup?.submissions.some(
			submission =>
				submission.status === "QUEUING" ||
				submission.status === "EVALUATING",
		),
	);
	const testCases = isAdmin
		? await problemRepo.findTestCases(id, version.versionNumber)
		: null;

	return (
		<main className={styles.page}>
			{user.isAuthenticated && submissionGroup && (
				<SubmissionStatusAutoRefresh
					active={hasInProgressSubmission}
					status={submissionGroup.submissions[0]?.status}
				/>
			)}
			<section className={styles.content}>
				<div className={styles.detailsBox}>
					<header className={styles.header}>
						<div>
							<h1>{version.name}</h1>

							<p className={styles.version}>
								Version {version.versionNumber}
								{isDraft && " · Draft"}
							</p>
						</div>

						<div className={styles.headerActions}>
							{testCases && (
								<ProblemTestCasesButton testCases={testCases} />
							)}
							<ProblemStatusBadge
								status={isDraft ? "DRAFT" : problem.status}
							/>

							{problem.status === ProblemStatus.ACTIVE && (
								<SubmitSolutionButton
									problemId={problem.id}
									hasInProgressSubmission={hasInProgressSubmission}
									extensions={version.languages.flatMap(
										language => language.extensions,
									)}
								/>
							)}

							{isAdmin && isDraft && (
								<PublishProblemButton problemId={problem.id} />
							)}
						</div>
					</header>

					{version.difficulty && (
						<p className={styles.difficulty}>
							Difficulty: {version.difficulty}
						</p>
					)}

					<section className={styles.section}>
						<h2>Description</h2>

						<p className={styles.description}>
							{version.description ??
								"No description provided."}
						</p>
					</section>

					<section className={styles.section}>
						<h2>Limits</h2>

						<div className={styles.infoGrid}>
							<div>
								<strong>Time Limit</strong>
								<p>
									{version.timeLimitMs === 0
										? "Unlimited"
										: `${version.timeLimitMs} ms`}
								</p>
							</div>

							<div>
								<strong>Memory Limit</strong>
								<p>
									{version.memoryLimitKb === 0
										? "Unlimited"
										: `${version.memoryLimitKb} KB`}
								</p>
							</div>

							<div>
								<strong>Output Comparison</strong>
								<p>{version.outputComparison}</p>
							</div>
						</div>
					</section>

					<section className={styles.section}>
						<h2>Supported Languages</h2>

						<ul className={styles.list}>
							{version.languages.map(language => (
								<li key={language.id}>
									{language.name}
								</li>
							))}
						</ul>
					</section>

					{user.isAuthenticated &&
						problem.status === ProblemStatus.ACTIVE && (
							<ProblemSubmissions
								group={submissionGroup}
							/>
						)}

					{canViewAttachments &&
						version.stuffs.length > 0 && (
							<section className={styles.section}>
								<h2>Attachments</h2>

								<ul className={styles.list}>
									{version.stuffs.map(stuff => {
										const filename =
											stuff.storagePath
												.replace(/\\/g, "/")
												.split("/")
												.pop() || "attachment";

										return (
											<li key={stuff.id}>
												<a
													href={`/api/stuff/${stuff.id}/download`}
												>
													{filename}
												</a>
											</li>
										);
									})}
								</ul>
							</section>
						)}
				</div>
			</section>
		</main>
	);
}
