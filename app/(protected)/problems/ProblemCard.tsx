import Link from "next/link";

import type { ProblemListItem } from "@/domain/problem/ProblemRepoTypes";
import ProblemStatusBadge from "@/components/ProblemStatusBadge";
import ChangeProblemStatus from "./[id]/details/ChangeProblemStatus";
import DeleteDraftButton from "./[id]/details/DeleteDraftButton";
import styles from "./page.module.css";

type Props = {
	problem: ProblemListItem;
	canManageProblems: boolean;
};

export default function ProblemCard({ problem, canManageProblems }: Props) {
	const draftOnly = problem.isDraft;
	return (
		<article className={styles.problem}>
			<Link href={`/problems/${problem.id}/details`} className={styles.problemLink}>
				<div className={styles.problemHeader}>
					<h2>{problem.name}</h2>
					<div className={styles.problemMeta}>
						{draftOnly ? (
							<span className={styles.draftBadge}>DRAFT {problem.versionNumber}</span>
						) : (
						<>
							<span className={styles.versionBadge}>VERSION {problem.versionNumber}</span>
							{canManageProblems && problem.draftVersionNumber !== null && (
								<span className={styles.draftBadge}>DRAFT {problem.draftVersionNumber}</span>
							)}
							<ProblemStatusBadge status={problem.status} />
						</>
						)}
					</div>
				</div>
				<p className={styles.difficulty}>{problem.difficulty ?? "Unspecified difficulty"}</p>
			</Link>
			{draftOnly ? (
				<div className={styles.problemActions}>
					<Link href={`/problems/${problem.id}/edit`} className={styles.editButton}>Edit Problem</Link>
					<DeleteDraftButton problemId={problem.id} isPublished={false} returnToProblems />
				</div>
			) : canManageProblems && (
				<div className={styles.problemActions}>
					<ChangeProblemStatus problemId={problem.id} currentStatus={problem.status} />
					<Link href={`/problems/${problem.id}/edit`} className={styles.editButton}>Edit Problem</Link>
					{problem.draftVersionNumber !== null && (
						<DeleteDraftButton problemId={problem.id} isPublished returnToProblems />
					)}
				</div>
			)}
		</article>
	);
}
