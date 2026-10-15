
import { requireOwner } from "@/lib/auth-guards";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
	SubmissionHistoryRepository,
	type SubmissionHistoryGroup,
} from "@/domain/submission/SubmissionHistoryRepository";
import HistoryClient from "../history/HistoryClient";

import styles from "./page.module.css";

type Props = {
	searchParams: Promise<{ q?: string | string[] }>;
};

type UserMatch = {
	id: string;
	username: string;
	registered_name: string;
};

function escapeLike(value: string): string {
	return value.replace(/[\\%_]/g, "\\$&");
}

export default async function QueryHistoryPage({ searchParams }: Props) {
	await requireOwner();

	const params = await searchParams;
	const query = (Array.isArray(params.q) ? params.q[0] : params.q ?? "").trim();

	let targetUser: UserMatch | null = null;
	let ambiguousName = false;

	if (query) {
		const pattern = escapeLike(query);

		const { data: usernameMatches, error: usernameError } =
			await supabaseAdmin
				.from("app_user")
				.select("id, username, registered_name")
				.ilike("username", pattern)
				.limit(2);

		if (usernameError) {
			throw new Error("Unable to search for the account.");
		}

		if (usernameMatches?.length === 1) {
			targetUser = usernameMatches[0] as UserMatch;
		} else if (!usernameMatches || usernameMatches.length === 0) {
			const { data: nameMatches, error: nameError } =
				await supabaseAdmin
					.from("app_user")
					.select("id, username, registered_name")
					.ilike("registered_name", pattern)
					.limit(2);

			if (nameError) {
				throw new Error("Unable to search for the account.");
			}

			if (nameMatches?.length === 1) {
				targetUser = nameMatches[0] as UserMatch;
			} else if (nameMatches && nameMatches.length > 1) {
				ambiguousName = true;
			}
		}
	}

	let groups: SubmissionHistoryGroup[] | null = null;

	if (targetUser) {
		const repository = new SubmissionHistoryRepository();
		groups = await repository.findHistory(targetUser.id, false);
	}

	return (
		<main className={styles.page}>
			<section className={styles.content}>
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

						<HistoryClient
							groups={groups}
							canViewAll={false}
						/>
					</section>
				)}
			</section>
		</main>
	);
}

