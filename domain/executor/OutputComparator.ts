import { OutputComparison } from "@/domain/problem/version/OutputComparison";

export class OutputComparator {
	static matches(
		actual: string,
		expected: string,
		comparison: OutputComparison,
	): boolean {
		switch (comparison) {
			case OutputComparison.EXACT:
				return actual === expected;

			case OutputComparison.TRIM:
				return actual.trim() === expected.trim();

			case OutputComparison.FREE:
				// for now
				return actual.trim() === expected.trim();

			default:
				return false;
		}
	}
}
