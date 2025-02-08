import { Server } from "ssh2";
import fs from "fs";
import { listener } from "./connection.ts";

const server = new Server(
  {
    hostKeys: [fs.readFileSync("./data/host.key")],
  },
  listener
);

server.listen(8022);
