import Link from "next/link";

import styles from "./page.module.css";

import { getCurrentVisitor } from "@/lib/auth";
import { ProblemRepo } from "@/data/supabase/repositories/ProblemRepo";
import GCButton from "@/components/GCButton";
import PageFrame from "@/components/PageFrame";
import ProblemsClient from "./ProblemsClient";

export default async function ProblemsPage() {
	const user = await getCurrentVisitor();
	const canManageProblems = user.canManageProblems;
	const isOwner = user.canRunGarbageCollection;

	const problemRepo = new ProblemRepo();
	const items = await problemRepo.findAllForListing(
		canManageProblems,
	);

	return (
		<PageFrame pageClassName={styles.page} contentClassName={styles.content}>
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

				<ProblemsClient items={items} canManageProblems={canManageProblems} />
		</PageFrame>
	);
}
