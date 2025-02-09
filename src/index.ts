import { Server } from "ssh2";
import fs from "fs";
import { listener } from "./connection.ts";

const server = new Server(
  {
    hostKeys: [fs.readFileSync("./data/host.key")],
    greeting: "terminal.write",
    banner: "terminal.write",
  },
  listener
);

server.listen(8022);
