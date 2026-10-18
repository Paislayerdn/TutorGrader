import Link from "next/link";

import styles from "./page.module.css";

import { getCurrentVisitor } from "@/lib/auth";
import { ProblemRepo } from "@/data/supabase/repositories/ProblemRepo";
import GCButton from "@/components/GCButton";
import ProblemCard from "./ProblemCard";

export default async function ProblemsPage() {
	const user = await getCurrentVisitor();
	const canManageProblems = user.canManageProblems;
	const isOwner = user.canRunGarbageCollection;

	const problemRepo = new ProblemRepo();
	const items = await problemRepo.findAllForListing(
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
								<ProblemCard key={problem.id} problem={problem} canManageProblems={canManageProblems} />
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
								<ProblemCard key={problem.id} problem={problem} canManageProblems={canManageProblems} />
							))}
						</div>
					)}
				</section>
			</section>
		</main>
	);
}
