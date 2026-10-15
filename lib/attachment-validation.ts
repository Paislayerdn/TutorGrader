const ALLOWED_ATTACHMENT_TYPES: Record<string, readonly string[]> = {
	".pdf": ["application/pdf"],
	".png": ["image/png"],
	".jpg": ["image/jpeg"],
	".jpeg": ["image/jpeg"],
	".gif": ["image/gif"],
	".webp": ["image/webp"],
	".bmp": ["image/bmp", "image/x-ms-bmp"],
};

export function isAllowedAttachment(
	filename: string,
	mimeType: string,
): boolean {
	const dotIndex = filename.lastIndexOf(".");

	if (dotIndex <= 0) return false;

	const extension = filename.slice(dotIndex).toLowerCase();

	return ALLOWED_ATTACHMENT_TYPES[extension]?.includes(mimeType) ?? false;
}
