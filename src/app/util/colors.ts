export type Color = { r: number; g: number; b: number };

function randColorInteger() {
  return Math.floor(Math.random() * 256);
}

export function createRandomColor(): Color {
  return {
    r: randColorInteger(),
    g: randColorInteger(),
    b: randColorInteger(),
  };
}
