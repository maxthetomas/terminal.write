import type { ServerConnectionListener } from "ssh2";
import getClientPublicKey, { getOrCreateUser } from "./util/authorization";
import { createPtyAndShell, createSession } from "./util/connection-setup";
import { createShellWrapper } from "./util/shell-util";
import getKeyStroke from "./util/keys";
import { UserApplication } from "./app/application";
import { broadcast } from "./app/util/clients";

export const listener: ServerConnectionListener = async (connection, info) => {
  let key = await getClientPublicKey(connection);
  let user = await getOrCreateUser(key);

  let session = await createSession(connection);
  let [pty, shell] = await createPtyAndShell(session);

  let wrapper = createShellWrapper(shell);

  shell.on("data", (data: Buffer) => {
    let key = getKeyStroke(data.toJSON().data);

    if (key.isCtrl && key.key === "c") {
      wrapper.clearScreen();
      shell.end();
      return;
    }
  });

  let app = await UserApplication.create(user, wrapper, {
    x: pty.cols,
    y: pty.rows,
  });
};
