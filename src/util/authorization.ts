import type { Connection, PublicKey } from "ssh2";

export default function getClientPublicKey(client: Connection) : Promise<PublicKey> { 
  return new Promise((resolve, reject) => { 
    client.on('authentication', (authCtx) => { 
      if (authCtx.method !== 'publickey') { 
        authCtx.reject([ 'publickey' ]);
        return;
      }

      authCtx.accept();
      resolve(authCtx.key);
    });

    client.once('close', () => reject());
  });
}

export async function getOrCreateUser(key: PublicKey) : Promise<{}> { 
  return {};
}
