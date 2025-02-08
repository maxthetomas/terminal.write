import { Server, ServerChannel } from "ssh2";

class ServerChannerWrapper { 
  channel : ServerChannel;

  constructor(channel: ServerChannel) {
    this.channel = channel;
  }

  write(str: string) {
    return this.channel.write(str.replace(/\r/g, "").replace(/\n/g, "\r\n"));
  }

  writeLine(str: string) { 
    return this.write(str + '\n');
  }
}

export function createShellWrapper(shell: ServerChannel) {
  return new ServerChannerWrapper(shell);
}
