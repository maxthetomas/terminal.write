import type { ServerConnectionListener } from "ssh2";
import getClientPublicKey, { getOrCreateUser } from "./util/authorization";
import { createPtyAndShell, createSession } from "./util/connection-setup";
import { createShellWrapper } from "./util/shell-util";

export const listener : ServerConnectionListener = async (connection, info) => { 
  let key = await getClientPublicKey(connection);
  let user = await getOrCreateUser(key);

  let session = await createSession(connection);
  let [ pty, shell ] = await createPtyAndShell(session);

  let wrapper = createShellWrapper(shell);

  wrapper.writeLine(JSON.stringify(pty, null, 2));
  wrapper.channel.end();
};
