import Link from "next/link";

import styles from "./page.module.css";

import { getCurrentVisitor } from "@/lib/auth";
import { ProblemRepository } from "@/domain/problem/ProblemRepository";
import { Admin } from "@/domain/user/Admin";
import { Owner } from "@/domain/user/Owner";
import GCButton from "@/components/GCButton";
import ProblemStatusBadge from "@/components/ProblemStatusBadge";
import ChangeProblemStatus from "./[id]/details/ChangeProblemStatus";
import DeleteDraftButton from "./[id]/details/DeleteDraftButton";

export default async function ProblemsPage() {
	const user = await getCurrentVisitor();
	const canManageProblems = user instanceof Admin;
	const isOwner = user instanceof Owner;

	const problemRepository = new ProblemRepository();
	const items = await problemRepository.findAllForListing(
		canManageProblems,
	);

	const draftProblems = items.filter(item => item.isDraft);
	const publishedProblems = items.filter(item => !item.isDraft);

	return (
		<main className={styles.page}>
			<section className={styles.content}>
				<header className={styles.header}>
					<h1>Problems</h1>

					<div className={styles.headerActions}>
						{canManageProblems && (
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

				{canManageProblems && draftProblems.length > 0 && (
					<section className={styles.section}>
						<h2>Drafts</h2>

						<div className={styles.list}>
							{draftProblems.map(problem => (
								<article
									key={problem.id}
									className={styles.problem}
								>
									<Link
										href={`/problems/${problem.id}/details`}
										className={styles.problemLink}
									>
										<div className={styles.problemHeader}>
											<h2>{problem.name}</h2>

											<div className={styles.problemMeta}>
												<span className={styles.draftBadge}>
													DRAFT {problem.versionNumber}
												</span>
											</div>
										</div>

										<p className={styles.difficulty}>
											{problem.difficulty ?? "Unspecified difficulty"}
										</p>
									</Link>

									<div className={styles.problemActions}>
										<Link
											href={`/problems/${problem.id}/edit`}
											className={styles.editButton}
										>
											Edit Problem
										</Link>

										<DeleteDraftButton
											problemId={problem.id}
											isPublished={false}
											returnToProblems
										/>
									</div>
								</article>
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
								<article
									key={problem.id}
									className={styles.problem}
								>
									<Link
										href={`/problems/${problem.id}/details`}
										className={styles.problemLink}
									>
										<div className={styles.problemHeader}>
											<h2>{problem.name}</h2>

											<div className={styles.problemMeta}>
												<span className={styles.versionBadge}>
													VERSION {problem.versionNumber}
												</span>

												{canManageProblems &&
													problem.draftVersionNumber !== null && (
														<span className={styles.draftBadge}>
															DRAFT {problem.draftVersionNumber}
														</span>
													)}

												<ProblemStatusBadge
													status={problem.status}
												/>
											</div>
										</div>

										<p className={styles.difficulty}>
											{problem.difficulty ?? "Unspecified difficulty"}
										</p>
									</Link>

									{canManageProblems && (
										<div className={styles.problemActions}>
											<ChangeProblemStatus
												problemId={problem.id}
												currentStatus={problem.status}
											/>

											<Link
												href={`/problems/${problem.id}/edit`}
												className={styles.editButton}
											>
												Edit Problem
											</Link>

											{problem.draftVersionNumber !== null && (
												<DeleteDraftButton
													problemId={problem.id}
													isPublished
													returnToProblems
												/>
											)}
										</div>
									)}
								</article>
							))}
						</div>
					)}
				</section>
			</section>
		</main>
	);
}
