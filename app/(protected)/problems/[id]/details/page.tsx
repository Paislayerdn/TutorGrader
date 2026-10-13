import { notFound, redirect } from "next/navigation";

import styles from "./page.module.css";

import { getCurrentUser } from "@/lib/auth";
import { ProblemRepository } from "@/domain/problem/ProblemRepository";
import { ProblemStatus } from "@/domain/problem/ProblemStatus";
import { Admin } from "@/domain/user/Admin";

import ProblemStatusBadge from "@/components/ProblemStatusBadge";
import PublishProblemButton from "./PublishProblemButton";
import DeleteDraftButton from "./DeleteDraftButton";
import ChangeProblemStatus from "./ChangeProblemStatus";

type Props = {
	params: Promise<{
		id: string;
	}>;
};

export default async function ProblemDetailsPage({ params }: Props) {
	const user = await getCurrentUser();
	const { id } = await params;

	const problemId = Number(id);

	if (!Number.isSafeInteger(problemId) || problemId <= 0) {
		notFound();
	}

	const problemRepository = new ProblemRepository();
	const problem = await problemRepository.findById(problemId);

	if (!problem) {
		notFound();
	}

	const isAdmin = user instanceof Admin;
	const isDraft = problem.currentVersionNumber === null;

	if (!isAdmin) {
		if (
			problem.status === ProblemStatus.INACTIVE ||
			problem.currentVersionNumber === null
		) {
			redirect("/problems");
		}
	}

	const version = isDraft
		? problem.getVersion(problem.currentDraftNumber!)
		: problem.getVersion(problem.currentVersionNumber!);

	if (!version) {
		notFound();
	}

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

							{isAdmin && (
								<>
									{isDraft ? (
										<>
											<PublishProblemButton problemId={problem.id} />
											<DeleteDraftButton problemId={problem.id} />
										</>
									) : (
										<ChangeProblemStatus
											problemId={problem.id}
											currentStatus={problem.status}
										/>
									)}
								</>
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
							{version.description ?? "No description provided."}
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
								<li key={language.id}>{language.name}</li>
							))}
						</ul>
					</section>

					<section className={styles.section}>
						<h2>Requirements</h2>

						{version.requirements.length === 0 ? (
							<p>No additional requirements.</p>
						) : (
							<ul className={styles.list}>
								{version.requirements.map((requirement, index) => (
									<li key={index}>{requirement}</li>
								))}
							</ul>
						)}
					</section>

					<section className={styles.section}>
						<h2>Attachments</h2>

						{version.stuffs.length === 0 ? (
							<p>No attachments.</p>
						) : (
							<ul className={styles.list}>
								{version.stuffs.map(stuff => {
									const filename =
										stuff.storagePath
											.replace(/\\/g, "/")
											.split("/")
											.pop() || "attachment";

									return (
										<li key={stuff.id}>
											<a href={`/api/stuff/${stuff.id}/download`}>
												{filename}
											</a>
										</li>
									);
								})}
							</ul>
						)}
					</section>

					{isAdmin && (
						<section className={styles.section}>
							<h2>Test Cases</h2>

							<div className={styles.testCases}>
								{version.testCases.map((testCase, index) => (
									<article
										key={index}
										className={styles.testCase}
									>
										<h3>Test Case {index + 1}</h3>

										<div className={styles.testCaseGrid}>
											<div>
												<strong>Input</strong>
												<pre>{testCase.input || "(empty)"}</pre>
											</div>

											<div>
												<strong>Expected Output</strong>
												<pre>
													{testCase.expectedOutput || "(empty)"}
												</pre>
											</div>
										</div>
									</article>
								))}
							</div>
						</section>
					)}
				</div>
			</section>
		</main>
	);
}

