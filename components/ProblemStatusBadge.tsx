import StatusBadge from "./StatusBadge";

export type ProblemStatusBadgeValue =
	| "ACTIVE"
	| "FIXING"
	| "INACTIVE"
	| "DRAFT";

type Props = {
	status: ProblemStatusBadgeValue;
};

export default function ProblemStatusBadge({ status }: Props) {
	return (
		<StatusBadge status={status}>
			{status}
		</StatusBadge>
	);
}
