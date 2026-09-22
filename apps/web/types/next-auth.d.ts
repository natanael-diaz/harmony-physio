// Module augmentation for the fields auth.ts puts on the token and session.
// Without this, callbacks reading token.role / session.user.id do not typecheck.
import type { Role } from "@harmony/db";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  // The object authorize() returns.
  interface User {
    role: Role;
  }
}
