import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { Admin } from "@/domain/user/Admin";
import { Owner } from "@/domain/user/Owner";
import styles from "./page.module.css";

export default async function DashboardPage() {
	const user = await getCurrentUser();

	if (!user) redirect("/login?error=unauthorized");

	let role = user.role;
	
	return (
		<main className={styles.page}>
			<section className={styles.content}>
				<p className={styles.eyebrow}>DASHBOARD</p>

				<h1>Welcome, {user.username}.</h1>

				<div className={styles.info}>
					<div>
						<span>Registered name</span>
						<strong>{user.registeredName}</strong>
					</div>

					<div>
						<span>Role</span>
						<strong>{role}</strong>
					</div>
				</div>
			</section>
		</main>
	);
}
