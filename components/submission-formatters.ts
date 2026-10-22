import type { SubmissionHistoryItem } from "@/data/supabase/repositories/SubmissionHistoryRepo";

export function formatSubmissionDate(value: string): string {
	return `${new Date(value)
		.toISOString()
		.slice(0, 16)
		.replace("T", " ")} UTC`;
}

export function getSubmissionLanguageLabel(submission: SubmissionHistoryItem): string {
	return submission.compilerId
		? `${submission.languageName} · ${submission.compilerId}`
		: submission.languageName;
}

export function getSubmissionLabel(submission: SubmissionHistoryItem): string {
	switch (submission.status) {
		case "QUEUING": return "Queuing";
		case "EVALUATING": return "Evaluating";
		case "COMPLETED": return "Complete";
		case "INCOMPLETE": return "Incomplete";
		case "ERROR": return "Error";
		default: return "Error";
	}
}

export function getPassedCount(submission: SubmissionHistoryItem): number {
	return submission.testResults.filter(result => result.status === "PASS").length;
}

export function formatTestVerdict(status: string): string {
	if (status === "PASS") return "Correct Output";
	if (status === "WRONG_ANSWER") return "Incorrect Output";
	return status.toLowerCase().split("_")
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}
