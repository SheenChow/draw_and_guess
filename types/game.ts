export type Role = "drawer" | "guesser";

export type Stroke = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  lineWidth: number;
};

export type RoomStateForDrawer = {
  strokes: Stroke[];
  secretWord: string;
  roundWon: boolean;
};

export type RoomStateForGuesser = {
  strokes: Stroke[];
  roundWon: boolean;
};
