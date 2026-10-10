import { getSession } from "@/lib/session";
import { UserRepository } from "@/domain/user/UserRepository";
import { UserStatus } from "@/domain/user/UserStatus";

const userRepository = new UserRepository();

export async function getCurrentUser() {
	const userId = await getSession();

	if (!userId) return null;

	try {
		const user = await userRepository.findById(userId);

		if (!user || user.status !== UserStatus.ACTIVE) {
			return null;
		}

		return user;
	} catch (error) {
		console.error("Current user lookup error:", error);
		return null;
	}
}
