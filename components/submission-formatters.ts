import type { SubmissionHistoryItem } from "@/data/supabase/repositories/SubmissionHistoryRepo";
import { TestVerdict } from "@/domain/submission/TestVerdict";

export function formatSubmissionDate(value: string): string {
	return new Date(value).toLocaleString(undefined, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function getSubmissionLanguageLabel(submission: SubmissionHistoryItem): string {
	return submission.compilerId
		? `${submission.languageName} · ${submission.compilerId}`
		: submission.languageName;
}

export function getSubmissionLabel(submission: SubmissionHistoryItem): string {
	if (submission.status === "ERROR") {
		return submission.compileDiagnostic ? "Compilation Error" : "Judging Error";
	}

	switch (submission.status) {
		case "QUEUING": return "Queuing";
		case "EVALUATING": return "Evaluating";
		case "COMPLETED": return "Complete";
		case "INCOMPLETE": return "Incomplete";
		default: return "Error";
	}
}

export function getPassedCount(submission: SubmissionHistoryItem): number {
	return submission.testResults.filter(result => result.status === TestVerdict.PASS).length;
}

export function formatTestVerdict(status: string): string {
	if (status === TestVerdict.PASS) return "Correct Output";
	if (status === TestVerdict.WRONG_ANSWER) return "Incorrect Output";
	return status.toLowerCase().split("_")
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}
