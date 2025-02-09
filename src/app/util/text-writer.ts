import { KeyStroke } from "../../util/keys";
import { ServerChannelWrapper } from "../../util/shell-util";
import { Color, createRandomColor } from "./colors";

type Mode =
  | "normal"
  | "insert"
  | "replace"
  | "visual"
  | "visual-line"
  | "delete"
  | "scroll"
  | "nav";

type Vec2 = { x: number; y: number };

export type ForeignCursor = {
  color: Color;
  name: string;
  position: number;
};

export class TextEditor {
  private text: string;
  private cursor: number;
  public terminalSize: Vec2;

  private foreignCursors: ForeignCursor[] = [];
  public ownForeignCursor: ForeignCursor;

  private mode: Mode = "normal";

  private skippedRenderingLines = 0;

  constructor(text: string) {
    this.text = text;
    this.cursor = 0;
    this.ownForeignCursor = {
      color: createRandomColor(),
      name: "User",
      position: 0,
    };
  }

  public getText() {
    return this.text;
  }

  public setText(text: string) {
    if (this.text !== text) {
      // respond to movement
      this.respondToTextMovement(text);
    }

    this.text = text;
  }

  public respondToTextMovement(newtext: string) {
    // Handle empty strings
    if (!this.text || !newtext) {
      this.cursor = 0;
      return;
    }

    // Find first differing character between old and new text
    let i = 0;
    while (
      i < Math.min(this.text.length, newtext.length) &&
      this.text[i] === newtext[i]
    ) {
      i++;
    }

    // Find last differing character working backwards
    let oldEnd = this.text.length - 1;
    let newEnd = newtext.length - 1;
    while (
      oldEnd >= i &&
      newEnd >= i &&
      this.text[oldEnd] === newtext[newEnd]
    ) {
      oldEnd--;
      newEnd--;
    }

    // If change was before cursor, adjust cursor position by the difference in text length
    if (i < this.cursor) {
      const lengthDiff = newEnd - i + 1 - (oldEnd - i + 1);
      // Ensure cursor stays within bounds
      this.cursor = Math.max(
        0,
        Math.min(newtext.length, this.cursor + lengthDiff)
      );
    }
  }

  public setTerminalSize(size: Vec2) {
    this.terminalSize = size;

    // Force rerender
    this._previousSkippedLines = -1;
  }

  public addForeignCursor(foreignCursor: ForeignCursor) {
    if (foreignCursor == this.ownForeignCursor) return;
    if (this.foreignCursors.includes(foreignCursor)) return;
    this.foreignCursors.push(foreignCursor);
  }

  clearForeignCursors() {
    this.foreignCursors = [];
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
    this.rememberedColumn = -1;

    this.cursor += position;
    if (this.cursor < 0) this.cursor = 0;
    if (this.cursor > this.text.length) this.cursor = this.text.length;
  }

  // todo: implement remembered column
  private rememberedColumn = -1;
  private adjustCursorLine(offset: number) {
    if (offset == 0) return;
    let { y: row, x: col } = this.getCursorLineAndOffset();

    if (row + offset < 0) return;
    if (row + offset >= this.text.split("\n").length) return;

    let newX = col;
    let nextLineText = this.text.split("\n")[row + offset];
    if (nextLineText.length < newX) {
      this.rememberedColumn = newX;
      newX = nextLineText.length - 1;
    }

    if (
      this.rememberedColumn !== -1 &&
      nextLineText.length > this.rememberedColumn
    ) {
      newX = this.rememberedColumn;
      this.rememberedColumn = -1;
    }

    if (newX < 0) newX = 0;
    if (row + offset === 0) newX--;

    this.cursor =
      this.text
        .split("\n")
        .splice(0, row + offset)
        .join("\n").length +
      1 +
      newX;

    if (this.cursor > this.text.length) this.cursor = this.text.length - 1;
  }

  private getForwardWordLength() {
    let text = this.text.slice(this.cursor);
    let word = text.match(/[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]+|\s+/u)?.[0];
    return word?.length ?? 0;
  }

  private getBackwardWordLength() {
    let text = this.text.slice(0, this.cursor);
    let word = text.match(/([\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]+|\s+)$/u)?.[0];
    return word?.length ?? 0;
  }

  private getForwardLineLength() {
    let cur = this.getCursorLineAndOffset();
    let fullLen = this.text.split("\n")[cur.y].length;
    return fullLen - cur.x;
  }

  private getBackwardLineLength() {
    return this.getCursorLineAndOffset().x;
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
    let { y: cursorLine } = this.getCursorLineAndOffset();
    this.text = this.text.split("\n").toSpliced(cursorLine, 1).join("\n");
  }

  private jumpToLine(line: number) {
    if (line >= this.text.split("\n").length) return;

    let indexOfLineStart = this.text
      .split("\n")
      .splice(0, line)
      .join("\n").length;

    this.cursor = indexOfLineStart;

    this.checkCursorValid();
  }

  private getCursorLineAndOffset() {
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

  //
  //
  //
  // RENDER
  //
  //
  //

  private previousLineCumulative(fromY: number) {
    return this.text
      .split("\n")
      .splice(this.skippedRenderingLines, fromY - this.skippedRenderingLines)
      .reduce((p, c) => p + Math.floor(c.length / this.terminalSize.x), 0);
  }

  private getActualCursorXY() {
    let { x: cposX, y: cposY } = this.getCursorLineAndOffset();

    let x = cposX % this.terminalSize.x;
    let y =
      cposY +
      Math.floor(cposX / this.terminalSize.x) +
      this.previousLineCumulative(cposY) -
      this.skippedRenderingLines;

    return { x, y };
  }

  private renderForeignCursors(terminal: ServerChannelWrapper) {
    let initCursorPosition = this.cursor;

    for (let i of this.foreignCursors) {
      this.cursor = i.position;

      const { x, y } = this.getActualCursorXY();

      terminal.cursorPosition(y + 1, x + 1);
      terminal.setRgbColor(i.color.r, i.color.g, i.color.b, true);
      terminal.write(this.text[this.cursor] ?? "");

      // if (y !== 0) {
      //   terminal.cursorUp(1);
      //   terminal.cursorBack(1);
      //   terminal.write(i.name);
      // }

      terminal.reset();
    }

    this.cursor = initCursorPosition;
  }

  private _previousRenderedText = "";
  private _previousSkippedLines = -1;
  public commitToTerminal(terminal: ServerChannelWrapper) {
    this.ownForeignCursor.position = this.cursor;

    terminal.hideCursor();
    terminal.cursorPosition(0, 0);

    let cursorLinePosition = 0;

    let clearLines =
      false || this._previousSkippedLines != this.skippedRenderingLines;

    if (clearLines) terminal.clearScreen();

    let idx = 0;
    for (let i of this.text.split("\n").splice(this.skippedRenderingLines)) {
      if (
        this._previousRenderedText.split("\n")[
          idx + this.skippedRenderingLines
        ] !== i
      ) {
        clearLines = true;
      }

      terminal.cursorColumn(0);
      if (clearLines) {
        terminal.clearLine();
      }
      terminal.write(i);

      let moveDown = Math.floor(i.length / this.terminalSize.x);
      idx++;

      cursorLinePosition += moveDown + 1;

      terminal.cursorDown();
      if (idx > this.terminalSize.y) {
        break;
      }
    }

    terminal.foregroundBrightBlue();
    for (let i = cursorLinePosition - 1; i < this.terminalSize.y - 1; i++) {
      terminal.cursorColumn(1);
      terminal.clearLine();
      terminal.write("~");
      terminal.cursorDown();
    }
    terminal.reset();

    this.renderForeignCursors(terminal);

    terminal.cursorPosition(this.terminalSize.y, 0);
    let color = this.ownForeignCursor.color;
    terminal.setRgbColor(color.r, color.g, color.b, true);
    terminal.clearLineToEnd();
    terminal.cursorPosition(this.terminalSize.y, 0);
    terminal.write(`[${this.mode.toUpperCase()}]`);
    terminal.cursorPosition(this.terminalSize.y, this.terminalSize.x - 15);
    let { x: lineX, y: lineY } = this.getCursorLineAndOffset();
    terminal.write(`${lineX + 1}:${lineY + 1}`);
    terminal.reset();

    let { x, y } = this.getActualCursorXY();
    terminal.cursorPosition(y + 1, x + 1);

    terminal.showCursor();

    if (this.mode === "insert") terminal.setCursorStyle("bar");
    else terminal.setCursorStyle("block");

    this._previousRenderedText = this.text;
    this._previousSkippedLines = this.skippedRenderingLines;
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
      case "scroll":
        this.onScrollKey(event);
        break;
      case "nav":
        this.onNavKey(event);
        break;
    }

    this.checkCursorValid();
  }

  private checkCursorValid() {
    if (this.getCursorLineAndOffset().y < this.skippedRenderingLines) {
      this.skippedRenderingLines = this.getCursorLineAndOffset().y;
    }
    if (
      this.getCursorLineAndOffset().y >=
      this.skippedRenderingLines + this.terminalSize.y - 2
    ) {
      this.skippedRenderingLines =
        this.getCursorLineAndOffset().y - this.terminalSize.y + 2;
    }
    if (this.skippedRenderingLines < 0) this.skippedRenderingLines = 0;
    if (this.skippedRenderingLines >= this.text.split("\n").length)
      this.text.split("\n").length - 1;

    if (this.cursor > this.text.length) this.cursor = this.text.length;
    if (this.cursor < 0) this.cursor = 0;
  }

  private onNormalKey(event: KeyStroke) {
    if (event.key === "i") this.setMode("insert");
    // if (event.key === "v") this.setMode("visual");
    // if (event.key === "V") this.setMode("visual-line");
    if (event.key === "r") this.setMode("replace");

    if (event.key === "h") this.adjustCursorPosition(-1);
    if (event.key === "l") this.adjustCursorPosition(1);
    if (event.key === "j") this.adjustCursorLine(1);
    if (event.key === "k") this.adjustCursorLine(-1);

    if (event.key === "d") this.setMode("delete");

    if (event.key === "x") this.deleteUnderCursor();
    if (event.key === "backspace") this.adjustCursorPosition(-1);

    if (event.key === "w")
      this.adjustCursorPosition(this.getForwardWordLength());
    if (event.key === "b")
      this.adjustCursorPosition(-this.getBackwardWordLength());

    if (event.key === "g") this.setMode("nav");
    if (event.key === "G") this.jumpToLine(this.text.split("\n").length - 1);

    if (event.key === "z") this.setMode("scroll");

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

  private onScrollKey(event: KeyStroke) {
    if (event.key === "t")
      this.skippedRenderingLines = this.getCursorLineAndOffset().y;
    if (event.key === "z")
      this.skippedRenderingLines =
        this.getCursorLineAndOffset().y - Math.floor(this.terminalSize.y / 2);
    if (event.key === "b")
      this.skippedRenderingLines =
        this.getCursorLineAndOffset().y - this.terminalSize.y + 1;
    this.setMode("normal");
  }

  private onNavKey(event: KeyStroke) {
    if (event.key === "g") this.jumpToLine(0);
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

    if (event.key === "home")
      this.adjustCursorPosition(-this.getBackwardLineLength());
    if (event.key === "end")
      this.adjustCursorPosition(this.getForwardLineLength());
  }
}
