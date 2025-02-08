import getKeyStroke from "../util/keys";
import { ServerChannelWrapper } from "../util/shell-util";
import { broadcast, registerClient, unregisterClient } from "./util/clients";
import { TextEditor } from "./util/text-writer";
import { User } from "./util/users";

const LOREM = `This is a test of the text editor.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

\`\`\`json
{
  "name": "John",
  "age": 30,
  "city": "New York"
}
\`\`\``;

export class UserApplication {
  private eventTrigger: EventTarget;
  public wrapper: ServerChannelWrapper;
  public user: User;

  private _textWriter: TextEditor;
  private _ptySize: { x: number; y: number };

  constructor(
    user: User,
    wrapper: ServerChannelWrapper,
    ptySize: { x: number; y: number }
  ) {
    this.eventTrigger = new EventTarget();
    this.wrapper = wrapper;
    this.user = user;
    this._ptySize = ptySize;

    this._textWriter = new TextEditor(LOREM);
    this._textWriter.setTerminalSize(this._ptySize);
    this._textWriter.commitToTerminal(this.wrapper);

    this.wrapper.channel.once("close", () => {
      unregisterClient(this);
    });

    registerClient(this);

    this.wrapper.channel.on("data", (data: Buffer) => {
      this._textWriter.onKey(getKeyStroke(data.toJSON().data));
      this._textWriter.commitToTerminal(this.wrapper);
    });

    this.eventTrigger.addEventListener("disconnect", () => {
      this.wrapper.channel.close();
    });
  }

  sendEvent(event: string, ...data: any[]) {
    this.eventTrigger.dispatchEvent(
      new CustomEvent(event, { detail: [...data] })
    );
  }

  static async create(
    user: User,
    wrapper: ServerChannelWrapper,
    ptySize: { x: number; y: number }
  ) {
    const app = new UserApplication(user, wrapper, ptySize);
    return app;
  }
}

export default UserApplication;
