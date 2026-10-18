import type { SubmissionHistoryItem } from "@/data/supabase/repositories/SubmissionHistoryRepo";

export function formatSubmissionDate(value: string): string {
	return `${new Date(value)
		.toISOString()
		.slice(0, 16)
		.replace("T", " ")} UTC`;
}

export function getSubmissionLabel(submission: SubmissionHistoryItem): string {
	return submission.testResults.length > 0 &&
		submission.testResults.every(result => result.status === "PASS")
		? "Complete"
		: "Incomplete";
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
