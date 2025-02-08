import UserApplication from "../application";
import { User } from "./users";

let connectedClients: UserApplication[] = [];

export function registerClient(application: UserApplication) {
  connectedClients.push(application);
}

export function unregisterClient(application: UserApplication) {
  connectedClients = connectedClients.filter(
    (client) => client !== application
  );
}

export function broadcast(event: string, data: any) {
  connectedClients.forEach((application) => {
    application.sendEvent(event, data);
  });
}
