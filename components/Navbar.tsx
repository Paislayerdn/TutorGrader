import Link from "next/link";
import styles from "./Navbar.module.css";
import ThemeToggle from "./ThemeToggle";

type NavbarUser = {
	username: string;
	role: "USER" | "ADMIN" | "OWNER";
};

type NavbarProps = {
	user?: NavbarUser | null;
};

export default function Navbar({ user = null }: NavbarProps) {
	const canCreateAccount =
		user?.role === "ADMIN" || user?.role === "OWNER";

	return (
		<nav className={styles.navbar}>
			<div className={styles.left}>
				<Link href="/" className={styles.brand}>
					TutorGrader
				</Link>

				{user && (
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

						{canCreateAccount && (
							<Link
								href="/createaccount"
								className={styles.link}
							>
								Create account
							</Link>
						)}
					</>
				)}
			</div>

			<div className={styles.right}>
				{user ? (
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
