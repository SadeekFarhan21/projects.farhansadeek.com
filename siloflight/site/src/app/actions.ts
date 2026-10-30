"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { getDb, isDbConfigured } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { deleteFlightById } from "@/lib/server-flights";

export type AuthFormState = {
  ok: boolean;
  error?: string;
} | null;

export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/flights" });
}

// Caps protect scrypt verification from being weaponized as a DoS vector — a
// 10MB password would otherwise tie up CPU on every sign-in attempt.
const MAX_EMAIL_LEN = 254; // RFC 5321
const MAX_PASSWORD_LEN = 256;
const MAX_NAME_LEN = 120;

export async function signInWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }
  if (email.length > MAX_EMAIL_LEN || password.length > MAX_PASSWORD_LEN) {
    return { ok: false, error: "Invalid email or password." };
  }
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/flights",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Invalid email or password." };
    }
    throw err;
  }
  return { ok: true };
}

export async function signUpWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isDbConfigured()) {
    return { ok: false, error: "Database is not configured." };
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim() || null;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > MAX_EMAIL_LEN) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 8 || password.length > MAX_PASSWORD_LEN) {
    return { ok: false, error: "Password must be 8–256 characters." };
  }
  if (name && name.length > MAX_NAME_LEN) {
    return { ok: false, error: "Name is too long." };
  }

  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    // Refuse from the public sign-up path whether or not a password is set.
    // Otherwise an OAuth-only account (passwordHash IS NULL) could be claimed
    // by anyone who knows the email. Returning the same generic error in both
    // branches also avoids account enumeration.
    return { ok: false, error: "An account with that email already exists." };
  }

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ email, name, passwordHash });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/flights",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Account created, but sign-in failed." };
    }
    throw err;
  }
  return { ok: true };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function deleteFlight(id: string) {
  const ok = await deleteFlightById(id);
  if (!ok) return { ok: false as const, error: "Flight not found." };
  revalidatePath("/flights");
  revalidatePath("/statistics");
  redirect("/flights");
}
