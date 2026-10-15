
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "tutorgrader_session";
const SESSION_DURATION = 60 * 60 * 5;

function getSecret() {
	const secret = process.env.AUTH_SECRET;

	if (!secret) {
		throw new Error("AUTH_SECRET is not configured.");
	}

	return new TextEncoder().encode(secret);
}

export type SessionStatus =
	| "authenticated"
	| "missing"
	| "expired"
	| "invalid";

export async function createSession(userId: string) {
	const token = await new SignJWT({
		userId,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(`${SESSION_DURATION}s`)
		.sign(getSecret());

	const cookieStore = await cookies();

	cookieStore.set(COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: SESSION_DURATION,
	});
}

export async function getSessionStatus(): Promise<{
	status: SessionStatus;
	userId: string | null;
	issuedAt: number | null;
}> {
	const cookieStore = await cookies();
	const token = cookieStore.get(COOKIE_NAME)?.value;

	if (!token) {
		return {
			status: "missing",
			userId: null,
			issuedAt: null,
		};
	}

	try {
		const { payload } = await jwtVerify(token, getSecret());

		if (typeof payload.userId !== "string") {
			return {
				status: "invalid",
				userId: null,
				issuedAt: null,
			};
		}

		return {
			status: "authenticated",
			userId: payload.userId,
			issuedAt: typeof payload.iat === "number"
				? payload.iat
				: null,
		};
	} catch (error) {
		if (
			error instanceof Error &&
			error.name === "JWTExpired"
		) {
			return {
				status: "expired",
				userId: null,
				issuedAt: null,
			};
		}

		return {
			status: "invalid",
			userId: null,
			issuedAt: null,
		};
	}
}

export async function getSession(): Promise<string | null> {
	const session = await getSessionStatus();

	return session.status === "authenticated"
		? session.userId
		: null;
}

export async function clearSession() {
	const cookieStore = await cookies();

	cookieStore.delete(COOKIE_NAME);
}

