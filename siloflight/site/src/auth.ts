import NextAuth, { CredentialsSignin } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

const adapter = isDbConfigured() ? DrizzleAdapter(getDb()) : undefined;

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (creds) => {
      const email =
        typeof creds?.email === "string" ? creds.email.trim().toLowerCase() : "";
      const password =
        typeof creds?.password === "string" ? creds.password : "";
      if (!email || !password) throw new InvalidCredentialsError();
      // Reject pathologically long inputs before they reach scrypt — protects
      // against CPU-exhaustion attacks via overlong password strings.
      if (email.length > 254 || password.length > 256) {
        throw new InvalidCredentialsError();
      }
      if (!isDbConfigured()) throw new InvalidCredentialsError();

      const rows = await getDb()
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          image: users.image,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      const user = rows[0];
      if (!user?.passwordHash) throw new InvalidCredentialsError();
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) throw new InvalidCredentialsError();

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter,
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.id = user.id;
      return token;
    },
    session: ({ session, token }) => {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
