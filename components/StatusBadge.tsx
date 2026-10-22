import type { ReactNode } from "react";

import styles from "./StatusBadge.module.css";

type Props = {
	status: string;
	children: ReactNode;
};

export default function StatusBadge({ status, children }: Props) {
	return (
		<span className={styles.badge} data-status={status}>
			{children}
		</span>
	);
}
