import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import styles from "./page.module.css";

export default async function DashboardPage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login?error=unauthorized");
	}

	return (
		<main className={styles.page}>
			<section className={styles.content}>
				<p className={styles.eyebrow}>DASHBOARD</p>

				<h1>
					Welcome, {user.username}.
				</h1>

				<div className={styles.info}>
					<div>
						<span>Registered name</span>
						<strong>{user.registered_name}</strong>
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
