"use client";

import { io, type Socket } from "socket.io-client";
import type { Role, RoomStateForDrawer, RoomStateForGuesser, Stroke } from "@/types/game";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/socket.io/",
      autoConnect: true,
    });
  }
  return socket;
}

export function joinRoom(s: Socket, roomId: string, role: Role) {
  s.emit("join-room", { roomId, role });
}

export type ClientEvents = {
  onRoomStateDrawer: (s: RoomStateForDrawer) => void;
  onRoomStateGuesser: (s: RoomStateForGuesser) => void;
  onStroke: (stroke: Stroke) => void;
  onCanvasCleared: () => void;
  onRoundWon: () => void;
  onNewRound: () => void;
  onSecretUpdated: () => void;
  onGuessResult: (payload: { ok: boolean; message: string }) => void;
};

export function bindGameSocket(
  s: Socket,
  _roomId: string,
  role: Role,
  handlers: Partial<ClientEvents>
) {
  const onRoom = (data: unknown) => {
    if (role === "drawer")
      handlers.onRoomStateDrawer?.(data as RoomStateForDrawer);
    else handlers.onRoomStateGuesser?.(data as RoomStateForGuesser);
  };

  const onStrokeEv = (stroke: Stroke) => handlers.onStroke?.(stroke);
  const onClearEv = () => handlers.onCanvasCleared?.();
  const onWonEv = () => handlers.onRoundWon?.();
  const onNewRoundEv = () => handlers.onNewRound?.();
  const onSecretEv = () => handlers.onSecretUpdated?.();
  const onGuessEv = (p: { ok: boolean; message: string }) =>
    handlers.onGuessResult?.(p);

  s.on("room-state", onRoom);
  s.on("stroke", onStrokeEv);
  s.on("canvas-cleared", onClearEv);
  s.on("round-won", onWonEv);
  s.on("new-round", onNewRoundEv);
  s.on("secret-updated", onSecretEv);
  s.on("guess-result", onGuessEv);

  return () => {
    s.off("room-state", onRoom);
    s.off("stroke", onStrokeEv);
    s.off("canvas-cleared", onClearEv);
    s.off("round-won", onWonEv);
    s.off("new-round", onNewRoundEv);
    s.off("secret-updated", onSecretEv);
    s.off("guess-result", onGuessEv);
  };
}

export function emitStroke(s: Socket, roomId: string, stroke: Stroke) {
  s.emit("stroke", { roomId, stroke });
}

export function emitClearCanvas(s: Socket, roomId: string) {
  s.emit("clear-canvas", { roomId });
}

export function emitSetSecretWord(s: Socket, roomId: string, word: string) {
  s.emit("set-secret-word", { roomId, word });
}

export function emitSubmitGuess(s: Socket, roomId: string, text: string) {
  s.emit("submit-guess", { roomId, text });
}

export function emitNewRound(s: Socket, roomId: string) {
  s.emit("new-round", { roomId });
}
