import Link from "next/link";

import styles from "./page.module.css";

import { getCurrentUser } from "@/lib/auth";
import { ProblemRepository } from "@/domain/problem/ProblemRepository";
import { ProblemStatus } from "@/domain/problem/ProblemStatus";

import { Admin } from "@/domain/user/Admin";

export default async function ProblemsPage() {
	const user = await getCurrentUser();
	const canCreateProblem = user instanceof Admin;

	const problemRepository = new ProblemRepository();
	const problems = await problemRepository.findAll();

	const visibleProblems = problems.filter(problem => {
		if (canCreateProblem) return true;

		return (
			problem.status === ProblemStatus.ACTIVE &&
			problem.currentVersionNumber !== null
		);
	});

	return (
		<main className={styles.page}>
			<section className={styles.content}>
				<header className={styles.header}>
					<h1>Problems</h1>

					{canCreateProblem && (
						<Link
							href="/problems/create"
							className={styles.createButton}
						>
							+ Create Problem
						</Link>
					)}
				</header>

				<p className={styles.description}>
					Choose a problem to view its statement and submit your solution.
				</p>

				<div className={styles.list}>
					{visibleProblems.length === 0 ? (
						<p className={styles.empty}>
							No active problems available.
						</p>
					) : (
						visibleProblems.map(problem => {
							const isDraft = problem.currentVersionNumber === null;

							const version = isDraft
								? problem.versions[0]
								: problem.getVersion(problem.currentVersionNumber!);

							if (!version) return null;

							return (
								<Link
									key={problem.id}
									href={`/problems/${problem.id}/details`}
									className={styles.problem}
								>
									<div className={styles.problemHeader}>
										<h2>{version.name}</h2>

										<span className={styles.version}>
											{isDraft
												? `Draft · Version ${version.versionNumber}`
												: `Version ${version.versionNumber}`}
										</span>
									</div>

									<p className={styles.difficulty}>
										{version.difficulty ?? "Unspecified difficulty"}
									</p>
								</Link>
							);
						})
					)}
				</div>
			</section>
		</main>
	);
}
