
import Link from "next/link";

import styles from "./page.module.css";

import { getCurrentUser } from "@/lib/auth";
import { ProblemRepository } from "@/domain/problem/ProblemRepository";
import { Admin } from "@/domain/user/Admin";
import { Owner } from "@/domain/user/Owner";
import GCButton from "@/components/GCButton";

import ProblemStatusBadge from "@/components/ProblemStatusBadge";

export default async function ProblemsPage() {
	const user = await getCurrentUser();
	const canCreateProblem = user instanceof Admin;

	const problemRepository = new ProblemRepository();
	const items = await problemRepository.findAllForListing(
		canCreateProblem,
	);

	const draftProblems = items.filter(item => item.isDraft);
	const publishedProblems = items.filter(item => !item.isDraft);
	const isOwner = user instanceof Owner;

	return (
		<main className={styles.page}>
			<section className={styles.content}>
				<header className={styles.header}>
					<h1>Problems</h1>

					<div className={styles.headerActions}>
						{canCreateProblem && (
							<Link
								href="/problems/create"
								className={styles.createButton}
							>
								+ Create Problem
							</Link>
						)}

						{isOwner && <GCButton />}
					</div>
				</header>

				<p className={styles.description}>
					Choose a problem to view its statement and submit your solution.
				</p>

				{canCreateProblem && draftProblems.length > 0 && (
					<section className={styles.section}>
						<h2>Drafts</h2>

						<div className={styles.list}>
							{draftProblems.map(problem => (
								<Link
									key={problem.id}
									href={`/problems/${problem.id}/details`}
									className={styles.problem}
								>
									<div className={styles.problemHeader}>
										<h2>{problem.name}</h2>

										<div className={styles.problemMeta}>
											<span className={styles.version}>
												Draft · Version {problem.versionNumber}
											</span>

											<ProblemStatusBadge status="DRAFT" />
										</div>
									</div>

									<p className={styles.difficulty}>
										{problem.difficulty ?? "Unspecified difficulty"}
									</p>
								</Link>
							))}
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
							{publishedProblems.map(problem => (
								<Link
									key={problem.id}
									href={`/problems/${problem.id}/details`}
									className={styles.problem}
								>
									<div className={styles.problemHeader}>
										<h2>{problem.name}</h2>

										<div className={styles.problemMeta}>
											<span className={styles.version}>
												Version {problem.versionNumber}
											</span>

											<ProblemStatusBadge
												status={problem.status}
											/>
										</div>
									</div>

									<p className={styles.difficulty}>
										{problem.difficulty ?? "Unspecified difficulty"}
									</p>
								</Link>
							))}
						</div>
					)}
				</section>
			</section>
		</main>
	);
}

