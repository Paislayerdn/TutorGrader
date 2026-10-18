import { notFound, redirect } from "next/navigation";

import styles from "./page.module.css";

import { getCurrentVisitor } from "@/lib/auth";
import { ProblemRepo } from "@/domain/problem/ProblemRepo";
import { ProblemStatus } from "@/domain/problem/ProblemStatus";
import { User } from "@/domain/user/User";
import { Admin } from "@/domain/user/Admin";
import { SubmissionHistoryRepo } from "@/data/supabase/repositories/SubmissionHistoryRepo";
import { isUuid } from "@/lib/isUuid";

import ProblemStatusBadge from "@/components/ProblemStatusBadge";
import PublishProblemButton from "./PublishProblemButton";
import DeleteDraftButton from "./DeleteDraftButton";
import SubmitSolutionButton from "./SubmitSolutionButton";
import ProblemSubmissions from "./ProblemSubmissions";

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

	const isAdmin = user instanceof Admin;

	const canViewAttachments =
		isAdmin || problem.status === ProblemStatus.ACTIVE;

	const isDraft =
		problem.currentVersionNumber === null ||
		(problem.status === ProblemStatus.INACTIVE && problem.draft !== null);

	if (!isAdmin) {
		if (
			problem.status === ProblemStatus.INACTIVE ||
			problem.currentVersionNumber === null
		) {
			redirect("/problems");
		}
	}

	const version =
		problem.status === ProblemStatus.INACTIVE && problem.draft
			? problem.draft
			: problem.currentVersion;

	if (!version) {
		notFound();
	}

	const submissionHistory =
		user instanceof User &&
		!isAdmin &&
		problem.status === ProblemStatus.ACTIVE
			? await new SubmissionHistoryRepo().findHistory(
				user.id,
				problem.id,
			)
			: [];

	const submissionGroup = submissionHistory[0] ?? null;

	return (
		<main className={styles.page}>
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
							<ProblemStatusBadge
								status={isDraft ? "DRAFT" : problem.status}
							/>

							{problem.status === ProblemStatus.ACTIVE && (
								<SubmitSolutionButton
									problemId={problem.id}
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

					{!isAdmin &&
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
