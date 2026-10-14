import { requireUser } from "@/lib/auth-guards";
import styles from "./page.module.css";

export default async function DashboardPage() {
	const user = await requireUser();

	return (
		<main className={styles.page}>
			<section className={styles.content}>
				<h1>Welcome, {user.username}.</h1>

				<div className={styles.info}>
					<div>
						<span>Registered name</span>
						<strong>{user.registeredName}</strong>
					</div>

					<div>
						<span>Role</span>
						<strong>{user.role}</strong>
					</div>
				</div>
			</section>
		</main>
	);
}
