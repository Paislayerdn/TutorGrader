import { SubmissionStatus } from "./SubmissionStatus";

/** Domain representation of a submitted solution and its judging state. */
export class Submission {
	constructor(
		public readonly id: string,
		public readonly userId: string,
		public readonly problemId: string,
		public readonly versionNumber: number,
		public readonly languageId: number,
		public status: SubmissionStatus,
		public readonly submittedAt: Date,
		public readonly sourceStuffId: string,
	) {}

	public get isInProgress(): boolean {
		return this.status === SubmissionStatus.QUEUING
			|| this.status === SubmissionStatus.EVALUATING;
	}

	public get isTerminal(): boolean {
		return this.status === SubmissionStatus.COMPLETED
			|| this.status === SubmissionStatus.INCOMPLETE
			|| this.status === SubmissionStatus.ERROR;
	}
}
