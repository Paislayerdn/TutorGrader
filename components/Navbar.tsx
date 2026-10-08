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
				<a href="/" className={styles.brand}>
					TutorGrader
				</a>

				{user && (
					<>
						<a href="/dashboard" className={styles.link}>
							Dashboard
						</a>

						<a href="/problems" className={styles.link}>
							Problems
						</a>

						<a href="/history" className={styles.link}>
							History
						</a>

						{canCreateAccount && (
							<a
								href="/createaccount"
								className={styles.link}
							>
								Create account
							</a>
						)}
					</>
				)}
			</div>

			<div className={styles.right}>
				{user ? (
					<>
						<a href="/account" className={styles.link}>
							Account
						</a>

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

						<a href="/login" className={styles.link}>
							Log in
						</a>
					</>
				)}
			</div>
		</nav>
	);
}
