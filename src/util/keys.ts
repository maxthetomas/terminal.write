// Control key mapping for readable output
const CTRL_CHARS: Record<number, string> = {
  1: "ctrl+a",
  2: "ctrl+b",
  3: "ctrl+c",
  4: "ctrl+d",
  5: "ctrl+e",
  6: "ctrl+f",
  7: "ctrl+g",
  8: "ctrl+h",
  9: "tab",
  10: "ctrl+j",
  11: "ctrl+k",
  12: "ctrl+l",
  13: "return",
  14: "ctrl+n",
  15: "ctrl+o",
  16: "ctrl+p",
  17: "ctrl+q",
  18: "ctrl+r",
  19: "ctrl+s",
  20: "ctrl+t",
  21: "ctrl+u",
  22: "ctrl+v",
  23: "ctrl+w",
  24: "ctrl+x",
  25: "ctrl+y",
  26: "ctrl+z",
  27: "escape",
  32: "space",
  127: "backspace",
};

// Function key sequences mapping
const FUNCTION_KEYS: Record<string, string> = {
  // Function keys
  OP: "f1", // ESC O P
  OQ: "f2", // ESC O Q
  OR: "f3", // ESC O R
  OS: "f4", // ESC O S
  "[15~": "f5", // ESC [ 1 5 ~
  "[17~": "f6", // ESC [ 1 7 ~
  "[18~": "f7", // ESC [ 1 8 ~
  "[19~": "f8", // ESC [ 1 9 ~
  "[20~": "f9", // ESC [ 2 0 ~
  "[21~": "f10", // ESC [ 2 1 ~
  "[23~": "f11", // ESC [ 2 3 ~
  "[24~": "f12", // ESC [ 2 4 ~

  // Navigation keys
  "[3~": "delete", // ESC [ 3 ~
  "[2~": "insert", // ESC [ 2 ~
  "[5~": "pageup", // ESC [ 5 ~
  "[6~": "pagedown", // ESC [ 6 ~
  "[1~": "home", // ESC [ 1 ~ (some terminals)
  "[4~": "end", // ESC [ 4 ~ (some terminals)
  "[Z": "shift+tab", // ESC [ Z

  // Add ctrl+arrow key mappings
  "[1;5A": "up", // ESC [ 1 ; 5 A - ctrl+up
  "[1;5B": "down", // ESC [ 1 ; 5 B - ctrl+down
  "[1;5C": "right", // ESC [ 1 ; 5 C - ctrl+right
  "[1;5D": "left", // ESC [ 1 ; 5 D - ctrl+left
};

// Common symbols mapping for readable output
const SYMBOLS: Record<number, string> = {
  33: "!", // shift+1
  64: "@", // shift+2
  35: "#", // shift+3
  36: "$", // shift+4
  37: "%", // shift+5
  94: "^", // shift+6
  38: "&", // shift+7
  42: "*", // shift+8
  40: "(", // shift+9
  41: ")", // shift+0
  95: "_", // shift+-
  43: "+", // shift+=
  123: "{", // shift+[
  125: "}", // shift+]
  124: "|", // shift+\
  58: ":", // shift+;
  34: '"', // shift+'
  60: "<", // shift+,
  62: ">", // shift+.
  63: "?", // shift+/
  96: "`", // backtick
  126: "~", // shift+`
  45: "-", // minus
  61: "=", // equals
  91: "[", // left bracket
  93: "]", // right bracket
  92: "\\", // backslash
  59: ";", // semicolon
  39: "'", // quote
  44: ",", // comma
  46: ".", // period
  47: "/", // forward slash
};

export class KeyStroke {
  readonly key: string;
  readonly isCtrl: boolean;
  readonly isAlt: boolean;
  readonly raw: number[];

  constructor(key: string, isCtrl = false, isAlt = false, raw: number[]) {
    this.key = key;
    this.isCtrl = isCtrl;
    this.isAlt = isAlt;
    this.raw = raw;
  }

  toString(): string {
    const modifiers: string[] = [];
    if (this.isCtrl) modifiers.push("ctrl");
    if (this.isAlt) modifiers.push("alt");

    return modifiers.length > 0
      ? `${modifiers.join("+")}+${this.key}`
      : this.key;
  }
}

export default function getKeyStroke(buffer: number[]): KeyStroke {
  // Handle control characters and special keys
  if (buffer.length === 1) {
    const code = buffer[0];
    // Check if it's a control character
    if (code < 32 || code === 127) {
      const key = CTRL_CHARS[code];
      if (key?.startsWith("ctrl+")) {
        return new KeyStroke(key.slice(5), true, false, buffer);
      }
      // Check for symbols
      if (SYMBOLS[code]) {
        return new KeyStroke(SYMBOLS[code], false, false, buffer);
      }
      return new KeyStroke(key || `char(${code})`, false, false, buffer);
    }
    return new KeyStroke(String.fromCharCode(code), false, false, buffer);
  }

  // Handle escape sequences for special keys
  if (buffer[0] === 27) {
    // Check for alt key combinations (ESC + char)
    if (buffer.length === 2) {
      const char = buffer[1];
      if (SYMBOLS[char]) {
        return new KeyStroke(SYMBOLS[char], false, true, buffer);
      }
      return new KeyStroke(String.fromCharCode(char), false, true, buffer);
    }

    // Convert buffer to string for function key lookup
    const sequence = String.fromCharCode(...buffer.slice(1));

    // Check for function keys and other special sequences
    if (
      buffer[1] === 79 ||
      (buffer[1] === 91 &&
        (buffer[buffer.length - 1] === 126 || buffer[buffer.length - 1] === 90))
    ) {
      const fnKey = FUNCTION_KEYS[sequence];
      if (fnKey) {
        return new KeyStroke(fnKey, false, false, buffer);
      }
    }

    if (buffer[1] === 91) {
      // ESC [
      switch (buffer[2]) {
        case 65:
          return new KeyStroke("up", false, false, buffer);
        case 66:
          return new KeyStroke("down", false, false, buffer);
        case 67:
          return new KeyStroke("right", false, false, buffer);
        case 68:
          return new KeyStroke("left", false, false, buffer);
        case 72:
          return new KeyStroke("home", false, false, buffer);
        case 70:
          return new KeyStroke("end", false, false, buffer);
      }

      // Check for ctrl+arrow sequences
      const sequence = String.fromCharCode(...buffer.slice(1));
      if (sequence.startsWith("[1;5")) {
        const fnKey = FUNCTION_KEYS[sequence];
        if (fnKey) {
          return new KeyStroke(fnKey, true, false, buffer);
        }
      }
    }
  }

  // Handle multi-byte UTF-8 characters (like Cyrillic)
  try {
    const uint8Array = new Uint8Array(buffer);
    const decoder = new TextDecoder("utf-8");
    return new KeyStroke(decoder.decode(uint8Array), false, false, buffer);
  } catch (error) {
    return new KeyStroke(String.fromCharCode(buffer[0]), false, false, buffer);
  }
}
