import argon2 from "argon2";

const DUMMY_PASSWORD_HASH =
	"$argon2id$v=19$m=65536,p=4,t=3$ERtyE+E1cuX3FGeJvYfNzA$M17MooNvIkPohWqq5U4lIzIDnIOlcbWcMpUowrZEY98";

export class PasswordHasher {
	public async hash(password: string): Promise<string> {
		return argon2.hash(password);
	}

	public async verify(hash: string, password: string): Promise<boolean> {
		return argon2.verify(hash, password);
	}

	public async verifyDummy(password: string): Promise<void> {
		await argon2.verify(DUMMY_PASSWORD_HASH, password);
	}
}
