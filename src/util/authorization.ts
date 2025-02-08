import type { Connection, PublicKey } from "ssh2";
import { User } from "../app/util/users";
import { usersTable } from "../db/schema";
import { eq } from "drizzle-orm";
import db from "../app/util/database";

export default function getClientPublicKey(
  client: Connection
): Promise<PublicKey> {
  return new Promise((resolve, reject) => {
    client.on("authentication", (authCtx) => {
      if (authCtx.method !== "publickey") {
        authCtx.reject(["publickey"]);
        return;
      }

      authCtx.accept();
      resolve(authCtx.key);
    });

    client.once("close", () => reject());
  });
}

export async function getOrCreateUser(key: PublicKey): Promise<User> {
  const keyData = key.data.toString("base64");

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.publicKey, keyData));

  if (!user) {
    const [newUser] = await db
      .insert(usersTable)
      .values({ publicKey: keyData })
      .returning();

    return newUser;
  }

  return user;
}
