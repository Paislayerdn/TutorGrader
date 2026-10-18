export const BUCKET = "problem-files";
export const MAX_FILES = 10;
export const MAX_TOTAL_SIZE = 4 * 1024 * 1024;

const ALLOWED_ATTACHMENT_TYPES: Record<string, readonly string[]> = {
	".pdf": ["application/pdf"],
	".png": ["image/png"],
	".jpg": ["image/jpeg"],
	".jpeg": ["image/jpeg"],
	".gif": ["image/gif"],
	".webp": ["image/webp"],
	".bmp": ["image/bmp", "image/x-ms-bmp"],
};

export function sanitizeFilename(filename: string): string {
	const basename = filename.replace(/\\/g, "/").split("/").pop() ?? "";
	const cleaned = basename
		.replace(/[\u0000-\u001f\u007f]/g, "")
		.replace(/[<>:"|?*]/g, "_")
		.trim();
	return cleaned && cleaned !== "." && cleaned !== ".." ? cleaned : "attachment";
}

export function extensionOf(filename: string): string {
	const dotIndex = filename.lastIndexOf(".");
	return dotIndex <= 0 ? "" : filename.slice(dotIndex).toLowerCase();
}

export function isAllowedAttachment(filename: string, mimeType: string): boolean {
	const extension = extensionOf(filename);
	return ALLOWED_ATTACHMENT_TYPES[extension]?.includes(mimeType) ?? false;
}
