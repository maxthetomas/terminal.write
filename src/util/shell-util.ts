import { Server, ServerChannel } from "ssh2";

export class ServerChannelWrapper {
  channel: ServerChannel;

  constructor(channel: ServerChannel) {
    this.channel = channel;
  }

  write(str: string) {
    return this.channel.write(str.replace(/\r/g, "").replace(/\n/g, "\r\n"));
  }

  writeLine(str: string) {
    return this.write(str + "\n");
  }

  // ANSI Control Sequences
  private esc(code: string) {
    return this.write(`\x1b[${code}`);
  }

  // Text Colors
  foregroundBlack() {
    return this.esc("30m");
  }
  foregroundRed() {
    return this.esc("31m");
  }
  foregroundGreen() {
    return this.esc("32m");
  }
  foregroundYellow() {
    return this.esc("33m");
  }
  foregroundBlue() {
    return this.esc("34m");
  }
  foregroundMagenta() {
    return this.esc("35m");
  }
  foregroundCyan() {
    return this.esc("36m");
  }
  foregroundWhite() {
    return this.esc("37m");
  }
  foregroundDefault() {
    return this.esc("39m");
  }

  // Background Colors
  backgroundBlack() {
    return this.esc("40m");
  }
  backgroundRed() {
    return this.esc("41m");
  }
  backgroundGreen() {
    return this.esc("42m");
  }
  backgroundYellow() {
    return this.esc("43m");
  }
  backgroundBlue() {
    return this.esc("44m");
  }
  backgroundMagenta() {
    return this.esc("45m");
  }
  backgroundCyan() {
    return this.esc("46m");
  }
  backgroundWhite() {
    return this.esc("47m");
  }
  backgroundDefault() {
    return this.esc("49m");
  }

  // Text Formatting
  bold() {
    return this.esc("1m");
  }
  dim() {
    return this.esc("2m");
  }
  italic() {
    return this.esc("3m");
  }
  underline() {
    return this.esc("4m");
  }
  blink() {
    return this.esc("5m");
  }
  inverse() {
    return this.esc("7m");
  }
  hidden() {
    return this.esc("8m");
  }
  strikethrough() {
    return this.esc("9m");
  }
  reset() {
    return this.esc("0m");
  }

  // Cursor Movement
  cursorUp(n = 1) {
    return this.esc(`${n}A`);
  }
  cursorDown(n = 1) {
    return this.esc(`${n}B`);
  }
  cursorForward(n = 1) {
    return this.esc(`${n}C`);
  }
  cursorBack(n = 1) {
    return this.esc(`${n}D`);
  }
  cursorNextLine(n = 1) {
    return this.esc(`${n}E`);
  }
  cursorPrevLine(n = 1) {
    return this.esc(`${n}F`);
  }
  cursorColumn(n = 1) {
    return this.esc(`${n}G`);
  }
  cursorPosition(row = 1, col = 1) {
    return this.esc(`${row};${col}H`);
  }

  // Screen Controls
  clearScreen() {
    return this.esc("2J");
  }
  clearScreenToEnd() {
    return this.esc("0J");
  }
  clearScreenToStart() {
    return this.esc("1J");
  }
  clearLine() {
    return this.esc("2K");
  }
  clearLineToEnd() {
    return this.esc("0K");
  }
  clearLineToStart() {
    return this.esc("1K");
  }

  // Scroll
  scrollUp(n = 1) {
    return this.esc(`${n}S`);
  }
  scrollDown(n = 1) {
    return this.esc(`${n}T`);
  }

  // Save/Restore Cursor Position
  saveCursor() {
    return this.esc("s");
  }
  restoreCursor() {
    return this.esc("u");
  }

  // Cursor Visibility
  hideCursor() {
    return this.esc("?25l");
  }
  showCursor() {
    return this.esc("?25h");
  }

  // Extended Color Support
  private rgb(r: number, g: number, b: number, isBackground = false) {
    return this.esc(`${isBackground ? "48" : "38"};2;${r};${g};${b}m`);
  }

  private color256(code: number, isBackground = false) {
    return this.esc(`${isBackground ? "48" : "38"};5;${code}m`);
  }

  // Convert hex to RGB and set color
  setHexColor(hex: string, isBackground = false) {
    // Remove # if present
    hex = hex.replace("#", "");

    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return this.rgb(r, g, b, isBackground);
  }

  // Set RGB color directly
  setRgbColor(r: number, g: number, b: number, isBackground = false) {
    return this.rgb(
      Math.min(255, Math.max(0, r)),
      Math.min(255, Math.max(0, g)),
      Math.min(255, Math.max(0, b)),
      isBackground
    );
  }

  // Set color using 256-color palette
  set256Color(code: number, isBackground = false) {
    return this.color256(Math.min(255, Math.max(0, code)), isBackground);
  }

  // Bright variants of basic colors
  foregroundBrightBlack() {
    return this.esc("90m");
  }
  foregroundBrightRed() {
    return this.esc("91m");
  }
  foregroundBrightGreen() {
    return this.esc("92m");
  }
  foregroundBrightYellow() {
    return this.esc("93m");
  }
  foregroundBrightBlue() {
    return this.esc("94m");
  }
  foregroundBrightMagenta() {
    return this.esc("95m");
  }
  foregroundBrightCyan() {
    return this.esc("96m");
  }
  foregroundBrightWhite() {
    return this.esc("97m");
  }

  backgroundBrightBlack() {
    return this.esc("100m");
  }
  backgroundBrightRed() {
    return this.esc("101m");
  }
  backgroundBrightGreen() {
    return this.esc("102m");
  }
  backgroundBrightYellow() {
    return this.esc("103m");
  }
  backgroundBrightBlue() {
    return this.esc("104m");
  }
  backgroundBrightMagenta() {
    return this.esc("105m");
  }
  backgroundBrightCyan() {
    return this.esc("106m");
  }
  backgroundBrightWhite() {
    return this.esc("107m");
  }

  // Modern Text Decorations
  doubleUnderline() {
    return this.esc("21m");
  }
  overline() {
    return this.esc("53m");
  }

  // Reset specific attributes
  resetBold() {
    return this.esc("22m");
  }
  resetDim() {
    return this.esc("22m");
  }
  resetItalic() {
    return this.esc("23m");
  }
  resetUnderline() {
    return this.esc("24m");
  }
  resetBlink() {
    return this.esc("25m");
  }
  resetInverse() {
    return this.esc("27m");
  }
  resetHidden() {
    return this.esc("28m");
  }
  resetStrikethrough() {
    return this.esc("29m");
  }
  resetOverline() {
    return this.esc("55m");
  }

  // Window Title
  setWindowTitle(title: string) {
    return this.write(`\x1b]0;${title}\x07`);
  }

  // Cursor Style
  setCursorStyle(style: "block" | "underline" | "bar") {
    const styles = {
      block: 2,
      underline: 4,
      bar: 6,
    };
    return this.esc(`${styles[style]} q`);
  }

  // Bracketed Paste Mode
  enableBracketedPaste() {
    return this.esc("?2004h");
  }
  disableBracketedPaste() {
    return this.esc("?2004l");
  }

  // Mouse Tracking
  enableMouse() {
    return this.esc("?1000h");
  }
  disableMouse() {
    return this.esc("?1000l");
  }

  // Focus Events
  enableFocusEvents() {
    return this.esc("?1004h");
  }
  disableFocusEvents() {
    return this.esc("?1004l");
  }

  // Alternative Screen Buffer
  enableAlternativeScreen() {
    return this.esc("?1049h");
  }
  disableAlternativeScreen() {
    return this.esc("?1049l");
  }
}

export function createShellWrapper(shell: ServerChannel) {
  return new ServerChannelWrapper(shell);
}
