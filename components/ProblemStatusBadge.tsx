import styles from "./ProblemStatusBadge.module.css";

export type ProblemStatusBadgeValue =
	| "ACTIVE"
	| "FIXING"
	| "INACTIVE"
	| "DRAFT";

type Props = {
	status: ProblemStatusBadgeValue;
};

export default function ProblemStatusBadge({ status }: Props) {
	const statusClass = {
		ACTIVE: styles.active,
		FIXING: styles.fixing,
		INACTIVE: styles.inactive,
		DRAFT: styles.draft,
	}[status];

	return (
		<span className={`${styles.badge} ${statusClass}`}>
			{status}
		</span>
	);
}
