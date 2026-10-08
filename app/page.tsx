import styles from "./page.module.css";

export default function Home() {
	return (
		<div className={styles.page}>
			<main className={styles.main}>
				<section className={styles.hero}>
					<p className={styles.eyebrow}>
						OBJECT ORIENTED PROGRAMMING
					</p>

					<h1>
						Practice.
						<br />
						Submit.
						<br />
						<span>Learn.</span>
					</h1>

					<p className={styles.description}>
						TutorGrader is a learning and grading platform for
						programming exercises, built to help students practice
						and understand object-oriented programming.
					</p>
				</section>

				<section id="about" className={styles.about}>
					<p>
						A focused environment for writing code, submitting
						solutions, and learning from the results.
					</p>
				</section>
			</main>

			<footer className={styles.footer}>
				<span>© 2026 TutorGrader</span>
				<span>OOP Learning Platform</span>
			</footer>
		</div>
	);
}
