import { KeyStroke } from "../../util/keys";
import { ServerChannelWrapper } from "../../util/shell-util";

type Mode =
  | "normal"
  | "insert"
  | "replace"
  | "visual"
  | "visual-line"
  | "delete";
type Vec2 = { x: number; y: number };

export class TextEditor {
  private text: string;
  private cursor: number;
  public terminalSize: Vec2;

  private mode: Mode = "normal";

  constructor(text: string) {
    this.text = text;
    this.cursor = 0;
  }

  public setTerminalSize(size: Vec2) {
    this.terminalSize = size;
  }

  public setMode(mode: Mode) {
    this.mode = mode;
  }

  public getMode() {
    return this.mode;
  }

  private insert(char: string) {
    this.text =
      this.text.slice(0, this.cursor) + char + this.text.slice(this.cursor);
    this.adjustCursorPosition(1);
  }

  private deleteAt(position: number, adjustCursor: number) {
    this.text =
      this.text.slice(0, this.cursor + position) +
      this.text.slice(this.cursor + position + 1);
    this.adjustCursorPosition(adjustCursor);
  }

  private deleteBackspace() {
    this.deleteAt(-1, -1);
  }

  private deleteUnderCursor() {
    this.deleteAt(0, 0);
  }

  private adjustCursorPosition(position: number) {
    this.cursor += position;
    if (this.cursor < 0) this.cursor = 0;
    if (this.cursor > this.text.length) this.cursor = this.text.length;
  }

  // todo: implement remembered column
  private rememberedCol = -1;
  private adjustCursorLine(offset: number) {
    if (offset == 0) return;
    let { y: row, x: col } = this.getCursorXY();

    if (row + offset < 0) return;
    if (row + offset > this.text.split("\n").length) return;

    let newX = col;
    let nextLineText = this.text.split("\n")[row + offset];
    if (nextLineText.length < newX) {
      newX = nextLineText.length - 1;
    }

    if (newX < 0) newX = 0;
    if (row + offset === 0) newX--;

    console.log(row, col, offset, newX);
    console.log(nextLineText);

    this.cursor =
      this.text
        .split("\n")
        .splice(0, row + offset)
        .join("\n").length +
      1 +
      newX;
  }

  private getForwardWordLength() {
    let text = this.text.slice(this.cursor);
    let word = text.match(/[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]+|\s+/u)?.[0];
    return word?.length ?? 0;
  }

  private getBackwardWordLength() {
    let text = this.text.slice(0, this.cursor);
    let word = text.match(/[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]+|\s+$/u)?.[0];
    return word?.length ?? 0;
  }

  private deleteWord() {
    let wordLength = this.getForwardWordLength();
    if (wordLength) {
      this.text = this.text
        .split("")
        .toSpliced(this.cursor, wordLength)
        .join("");
    }
  }

  private deleteLine() {
    let { y: cursorLine } = this.getCursorXY();
    this.text = this.text.split("\n").toSpliced(cursorLine, 1).join("\n");
  }

  //
  //
  //
  // RENDER
  //
  //
  //

  private getCursorXY() {
    // Calculate and adjust cursor position
    let beforeCursorLines = this.text.substring(0, this.cursor).match(/\n/g);
    let cursorLine = beforeCursorLines?.length ?? 0;
    let lineStartIndex = this.text
      .substring(0, this.cursor)
      .split("")
      .lastIndexOf("\n");
    let cursorLinePos = this.cursor - lineStartIndex - 1;

    return { x: cursorLinePos, y: cursorLine };
  }

  public commitToTerminal(terminal: ServerChannelWrapper) {
    terminal.hideCursor();
    terminal.clearScreen();
    terminal.cursorPosition(0, 0);
    terminal.write(this.text);

    terminal.cursorPosition(this.terminalSize.y, 0);
    terminal.clearLineToEnd();
    terminal.write(`[${this.mode.toUpperCase()}]`);
    terminal.cursorPosition(this.terminalSize.y, this.terminalSize.x - 15);

    let { x, y } = this.getCursorXY();
    terminal.write(`${y + 1}:${x + 1}`);

    terminal.cursorPosition(y + 1, x + 1);
    terminal.showCursor();

    if (this.mode === "insert") terminal.setCursorStyle("bar");
    else terminal.setCursorStyle("block");
  }

  //
  //
  //
  //  MOVEMENT
  //
  //
  //

  public onKey(event: KeyStroke) {
    switch (this.mode) {
      case "normal":
        this.onNormalKey(event);
        break;
      case "insert":
        this.onInsertKey(event);
        break;
      case "delete":
        this.onDeleteKey(event);
        break;
      case "replace":
        this.onReplaceKey(event);
        break;
    }
  }

  private onNormalKey(event: KeyStroke) {
    if (event.key === "i") this.setMode("insert");
    // if (event.key === "v") this.setMode("visual");
    // if (event.key === "V") this.setMode("visual-line");
    if (event.key === "r") this.setMode("replace");
    if (event.key === "h") this.adjustCursorPosition(-1);
    if (event.key === "l") this.adjustCursorPosition(1);

    // if (event.key === "j") this.adjustCursorPosition(1);
    // if (event.key === "k") this.adjustCursorPosition(-1);

    if (event.key === "d") this.setMode("delete");

    if (event.key === "x") this.deleteUnderCursor();
    if (event.key === "backspace") this.adjustCursorPosition(-1);

    if (event.key === "w")
      this.adjustCursorPosition(this.getForwardWordLength());
    if (event.key === "b")
      this.adjustCursorPosition(-this.getBackwardWordLength());

    this.processCommonMove(event);
  }

  private onInsertKey(event: KeyStroke) {
    if (event.toString().length === 1) {
      this.insert(event.key);
      return;
    }

    if (event.key === "escape") this.setMode("normal");
    if (event.key === "backspace") this.deleteBackspace();
    if (event.key === "delete") this.deleteUnderCursor();

    if (event.key === "return") this.insert("\n");

    this.processCommonMove(event);
  }

  private onDeleteKey(event: KeyStroke) {
    if (event.key === "w") this.deleteWord();
    if (event.key === "d") this.deleteLine();
    this.setMode("normal");
  }

  private onReplaceKey(event: KeyStroke) {
    if (event.toString().length === 1) {
      let txt = this.text.split("");
      txt[this.cursor] = event.key;
      this.text = txt.join("");
    }
    this.setMode("normal");
  }

  private processCommonMove(event: KeyStroke) {
    if (event.isCtrl) {
      if (event.key === "left")
        this.adjustCursorPosition(-this.getBackwardWordLength());
      if (event.key === "right")
        this.adjustCursorPosition(this.getForwardWordLength());
    } else {
      if (event.key === "left") this.adjustCursorPosition(-1);
      if (event.key === "right") this.adjustCursorPosition(1);
    }

    if (event.key === "down") this.adjustCursorLine(1);
    if (event.key === "up") this.adjustCursorLine(-1);
  }
}
