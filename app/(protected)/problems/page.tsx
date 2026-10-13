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
			problem.status !== ProblemStatus.INACTIVE
			&&
			problem.currentVersionNumber !== null
		);
	});

	const publishedProblems = visibleProblems.filter(
		problem => problem.currentVersionNumber !== null,
	);

	const draftProblems = visibleProblems.filter(
		problem => problem.currentVersionNumber === null,
	);

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

				{canCreateProblem && draftProblems.length > 0 && (
					<section className={styles.section}>
						<h2>Drafts</h2>

						<div className={styles.list}>
							{draftProblems.map(problem => {
								const version = problem.versions[0];

								if (!version) return null;

								return (
									<Link
										key={problem.id}
										href={`/problems/${problem.id}/details`}
										className={styles.problem}
									>
										<div className={styles.problemHeader}>
											<h2>{version.name}</h2>

											<div className={styles.problemMeta}>
												<span className={styles.version}>
													Version {version.versionNumber}
												</span>

												<span
													className={`${styles.status} ${
														problem.status === ProblemStatus.ACTIVE
															? styles.statusActive
															: problem.status === ProblemStatus.FIXING
																? styles.statusFixing
																: styles.statusInactive
													}`}
												>
													{problem.status}
												</span>
											</div>
										</div>

										<p className={styles.difficulty}>
											{version.difficulty ?? "Unspecified difficulty"}
										</p>
									</Link>
								);
							})}
						</div>
					</section>
				)}

				<section className={styles.section}>
					<h2>Published Problems</h2>

					{publishedProblems.length === 0 ? (
						<p className={styles.empty}>
							No published problems available.
						</p>
					) : (
						<div className={styles.list}>
							{publishedProblems.map(problem => {
								const version = problem.getVersion(
									problem.currentVersionNumber!,
								);

								if (!version) return null;

								return (
									<Link
										key={problem.id}
										href={`/problems/${problem.id}/details`}
										className={styles.problem}
									>
										<div className={styles.problemHeader}>
											<h2>{version.name}</h2>

											<div className={styles.problemMeta}>
												<span className={styles.version}>
													Version {version.versionNumber}
												</span>

												<span
													className={`${styles.status} ${
														problem.status === ProblemStatus.ACTIVE
															? styles.statusActive
															: problem.status === ProblemStatus.FIXING
																? styles.statusFixing
																: styles.statusInactive
													}`}
												>
													{problem.status}
												</span>
											</div>
										</div>

										<p className={styles.difficulty}>
											{version.difficulty ?? "Unspecified difficulty"}
										</p>
									</Link>
								);
							})}
						</div>
					)}
				</section>
			</section>
		</main>
	);
}
