import type { Connection, PseudoTtyInfo, ServerChannel, Session } from "ssh2";

export function createSession(connection: Connection): Promise<Session> {
  return new Promise((resolve, reject) => {
    connection.once("session", (accept) => {
      let session = accept();
      resolve(session);
    });

    connection.once('close', () => reject());
  });
}

export function createPtyAndShell(session: Session) : Promise<[ PseudoTtyInfo, ServerChannel ]> {
  let ptyPromise = new Promise((resolve, reject) => {
    session.once("pty", (accept, reject, info) => {
      accept();
      resolve(info);
    });

    session.once('close', () => reject());
  }) as Promise<PseudoTtyInfo>;

  let shellPromise = new Promise((resolve, reject) => {
    session.once("shell", (accept, reject) => {
      const shell = accept();
      resolve(shell);
    });
    
    session.once('close', () => reject());
  }) as Promise<ServerChannel>;

  return Promise.all([ptyPromise, shellPromise]);
}
