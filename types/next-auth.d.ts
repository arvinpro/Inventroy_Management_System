import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** The user's role */
      role: "admin" | "staff";
    } & DefaultSession["user"];
  }

  interface User {
    role: "admin" | "staff";
  }
}
