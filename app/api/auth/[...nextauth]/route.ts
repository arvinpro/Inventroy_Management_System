import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" }, // admin or staff
      },
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials.password || !credentials.role)
          return null;

        let user;

        if (credentials.role === "admin") {
          user = await prisma.admin.findUnique({
            where: { email: credentials.email },
          });
        } else if (credentials.role === "staff") {
          user = await prisma.staff.findUnique({
            where: { email: credentials.email },
          });
        }

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return { id: user.id, email: user.email, role: credentials.role };
      },
    }),
  ],

  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      if (token?.role) (session.user as any).role = token.role;
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
