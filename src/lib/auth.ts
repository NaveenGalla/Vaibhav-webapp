import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) {
            console.error("[auth] validation failed", parsed.error);
            return null;
          }

          const { email, password } = parsed.data;
          const user = await db.user.findUnique({ where: { email } });

          if (!user) {
            console.error("[auth] user not found:", email);
            return null;
          }
          if (!user.isActive) {
            console.error("[auth] user not active:", email);
            return null;
          }

          const valid = await bcrypt.compare(password, user.password);
          if (!valid) {
            console.error("[auth] password mismatch for:", email);
            return null;
          }

          return {
            id:       user.id,
            name:     user.name,
            email:    user.email,
            role:     user.role,
            branchId: user.branchId ?? undefined,
          };
        } catch (err) {
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.id       = user.id;
        token.role     = (user as any).role;
        token.branchId = (user as any).branchId;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id              = token.id as string;
        (session.user as any).role     = token.role;
        (session.user as any).branchId = token.branchId;
      }
      return session;
    },
  },
});
