
import { requireOwner } from "@/lib/auth-guards";
import { UserRepo } from "@/data/supabase/repositories/UserRepo";
import PageFrame from "@/components/PageFrame";
import {
	SubmissionHistoryRepo,
	type SubmissionHistoryGroup,
} from "@/data/supabase/repositories/SubmissionHistoryRepo";
import HistoryClient from "../history/HistoryClient";

import styles from "./page.module.css";

type Props = {
	searchParams: Promise<{ q?: string | string[] }>;
};

export default async function QueryHistoryPage({ searchParams }: Props) {
	await requireOwner();

	const params = await searchParams;
	const query = (Array.isArray(params.q) ? params.q[0] : params.q ?? "").trim();

	let targetUser: { id: string; username: string; registered_name: string } | null = null;
	let ambiguousName = false;

	if (query) {
		const result = await new UserRepo().searchForQueryHistory(query);
		targetUser = result.user;
		ambiguousName = result.ambiguousRegisteredName;
	}

	let groups: SubmissionHistoryGroup[] | null = null;

	if (targetUser) {
		const repository = new SubmissionHistoryRepo();
		groups = await repository.findHistory(targetUser.id);
	}

	return (
		<PageFrame pageClassName={styles.page} contentClassName={styles.content}>
				<header className={styles.header}>
					<h1>Query History</h1>
					<p className={styles.description}>
						Search by username first. If no username matches,
						the registered name is checked instead.
					</p>
				</header>

				<form method="GET" className={styles.searchForm}>
					<input
						type="search"
						name="q"
						defaultValue={query}
						placeholder="Username or registered name"
						aria-label="Username or registered name"
						className={styles.searchInput}
						required
					/>
					<button type="submit" className={styles.searchButton}>
						Search
					</button>
				</form>

				{query && !targetUser && (
					<p className={styles.message}>
						{ambiguousName
							? "Multiple accounts have that registered name. Search by username instead."
							: "No account was found for that username or registered name."}
					</p>
				)}

				{targetUser && groups && (
					<section className={styles.results}>
						<h2>
							History for {targetUser.username}
						</h2>
						<p className={styles.registeredName}>
							{targetUser.registered_name}
						</p>

						<HistoryClient groups={groups} />
					</section>
				)}
		</PageFrame>
	);
}

