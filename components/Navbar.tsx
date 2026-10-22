import Link from "next/link";

import { Visitor } from "@/domain/user/Visitor";

import styles from "./Navbar.module.css";
import ThemeToggle from "./ThemeToggle";

type NavbarProps = {
	user: Visitor;
};

export default function Navbar({ user }: NavbarProps) {
	const isUser = user.isAuthenticated;
	const canCreateAccount = user.canCreateAccounts;
	const isOwner = user.canViewQueryHistory;

	return (
		<nav className={styles.navbar}>
			<div className={styles.left}>
				<Link href="/" className={styles.brand}>
					TutorGrader
				</Link>

				{isUser && (
					<>
						<Link href="/dashboard" className={styles.link}>
							Dashboard
						</Link>

						<Link href="/problems" className={styles.link}>
							Problems
						</Link>

						<Link href="/history" className={styles.link}>
							History
						</Link>

						{isOwner && (
							<Link href="/query-history" className={styles.link}>
								Query History
							</Link>
						)}
					</>
				)}
			</div>

			<div className={styles.right}>
				{canCreateAccount && (
					<Link
						href="/createaccount"
						className={styles.link}
					>
						Create Account
					</Link>
				)}
				
				{isUser ? (
					<>
						<Link href="/account" className={styles.link}>
							Account
						</Link>

						<ThemeToggle />

						<form action="/api/auth/logout" method="POST">
							<button
								type="submit"
								className={styles.logout}
							>
								Log out
							</button>
						</form>
					</>
				) : (
					<>
						<ThemeToggle />

						<Link href="/login" className={styles.link}>
							Log in
						</Link>
					</>
				)}
			</div>
		</nav>
	);
}
