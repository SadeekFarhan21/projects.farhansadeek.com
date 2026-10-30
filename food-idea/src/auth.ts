import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Twitch from "next-auth/providers/twitch";
import { createServiceClient } from "@/lib/supabase/server";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Twitch({
      clientId: process.env.TWITCH_CLIENT_ID!,
      clientSecret: process.env.TWITCH_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return false;

      const supabase = createServiceClient();

      // Check if this OAuth account already exists
      const { data: existingOAuth } = await supabase
        .from("oauth_accounts")
        .select("user_id")
        .eq("provider", account.provider)
        .eq("provider_account_id", account.providerAccountId)
        .single();

      if (existingOAuth) {
        // Existing user, update tokens
        await supabase
          .from("oauth_accounts")
          .update({
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at
              ? new Date(account.expires_at * 1000).toISOString()
              : null,
          })
          .eq("provider", account.provider)
          .eq("provider_account_id", account.providerAccountId);
        return true;
      }

      // Check if user exists by email (for account linking)
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.email)
        .single();

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user
        const { data: newUser, error } = await supabase
          .from("users")
          .insert({
            email: user.email,
            display_name: user.name || user.email.split("@")[0],
            avatar_url: user.image,
          })
          .select("id")
          .single();

        if (error || !newUser) return false;
        userId = newUser.id;
      }

      // Link OAuth account
      await supabase.from("oauth_accounts").insert({
        user_id: userId,
        provider: account.provider,
        provider_account_id: account.providerAccountId,
        provider_username: user.name,
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expires_at: account.expires_at
          ? new Date(account.expires_at * 1000).toISOString()
          : null,
      });

      return true;
    },

    async jwt({ token, account }) {
      if (account) {
        const supabase = createServiceClient();
        const { data: oauthAccount } = await supabase
          .from("oauth_accounts")
          .select("user_id")
          .eq("provider", account.provider)
          .eq("provider_account_id", account.providerAccountId)
          .single();

        if (oauthAccount) {
          const { data: dbUser } = await supabase
            .from("users")
            .select("id, username, is_creator")
            .eq("id", oauthAccount.user_id)
            .single();

          if (dbUser) {
            token.userId = dbUser.id;
            token.username = dbUser.username;
            token.isCreator = dbUser.is_creator;
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
        session.user.username = token.username as string | null;
        session.user.isCreator = token.isCreator as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
});
