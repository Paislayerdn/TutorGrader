import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "tutorgrader_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
        throw new Error("AUTH_SECRET is not configured.");
    }

    return new TextEncoder().encode(secret);
}

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

export async function getSession(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, getSecret());

        if (typeof payload.userId !== "string") {
            return null;
        }

        return payload.userId;
    } catch {
        return null;
    }
}

export async function clearSession() {
    const cookieStore = await cookies();

    cookieStore.delete(COOKIE_NAME);
}
