import { argon2id, hash, verify } from "argon2";

const passwordHashOptions = {
  type: argon2id as 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, passwordHashOptions);
}

export async function verifyPassword(
  passwordHash: string,
  candidate: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, candidate);
  } catch {
    return false;
  }
}
