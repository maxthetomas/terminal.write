import { ServerChannelWrapper } from "../util/shell-util";
import { broadcast, registerClient, unregisterClient } from "./util/clients";
import { User } from "./util/users";

type UserApplication = {
  sendEvent: (event: string, data: any) => void;
  wrapper: ServerChannelWrapper;
  user: User;
};

async function createUserApplication(
  user: User,
  wrapper: ServerChannelWrapper
) {
  let eventTarget = new EventTarget();

  const application: UserApplication = {
    wrapper,
    user,
    sendEvent: (event: string, data: any) => {
      eventTarget.dispatchEvent(new CustomEvent(event, { detail: data }));
    },
  };

  application.wrapper.channel.once("close", () => {
    unregisterClient(application);
  });

  registerClient(application);

  return application;
}

export default UserApplication;
