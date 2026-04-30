import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";

/** 端口：命令行第一个参数 > 环境变量 PORT > 默认 3002（避免忽略 `node server.mjs 3002`） */
function resolvePort() {
  const fromArgv = process.argv[2];
  if (fromArgv && /^\d+$/.test(fromArgv)) {
    return parseInt(fromArgv, 10);
  }
  if (process.env.PORT) {
    return parseInt(process.env.PORT, 10);
  }
  return 3002;
}

const port = resolvePort();
process.env.PORT = String(port);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/** @type {Map<string, { strokes: object[], secretWord: string, roundWon: boolean }>} */
const rooms = new Map();

function normalizeWord(w) {
  return String(w || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { strokes: [], secretWord: "", roundWon: false });
  }
  return rooms.get(roomId);
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/socket.io/",
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId, role }) => {
      if (!roomId || !role) return;
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.role = role;

      const room = getOrCreateRoom(roomId);

      if (role === "drawer") {
        socket.emit("room-state", {
          strokes: room.strokes,
          secretWord: room.secretWord,
          roundWon: room.roundWon,
        });
      } else {
        socket.emit("room-state", {
          strokes: room.strokes,
          roundWon: room.roundWon,
        });
      }
    });

    socket.on("set-secret-word", ({ roomId, word }) => {
      const room = rooms.get(roomId);
      if (!room || socket.data.role !== "drawer") return;
      room.secretWord = String(word || "").trim();
      room.roundWon = false;
      io.to(roomId).emit("secret-updated", { roundWon: false });
    });

    socket.on("stroke", ({ roomId, stroke }) => {
      const room = rooms.get(roomId);
      if (!room || socket.data.role !== "drawer") return;
      room.strokes.push(stroke);
      socket.to(roomId).emit("stroke", stroke);
    });

    socket.on("clear-canvas", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || socket.data.role !== "drawer") return;
      room.strokes = [];
      socket.to(roomId).emit("canvas-cleared");
    });

    socket.on("submit-guess", ({ roomId, text }) => {
      const room = rooms.get(roomId);
      if (!room || socket.data.role !== "guesser") return;
      const target = normalizeWord(room.secretWord);
      if (!target) {
        socket.emit("guess-result", {
          ok: false,
          message: "画手尚未设置词语",
        });
        return;
      }
      const guess = normalizeWord(text);
      if (guess === target) {
        room.roundWon = true;
        io.to(roomId).emit("round-won", {});
        socket.emit("guess-result", { ok: true, message: "猜对了！" });
      } else {
        socket.emit("guess-result", {
          ok: false,
          message: "再想想看～",
        });
      }
    });

    socket.on("new-round", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || socket.data.role !== "drawer") return;
      room.strokes = [];
      room.secretWord = "";
      room.roundWon = false;
      io.to(roomId).emit("new-round", { strokes: [] });
    });

    socket.on("disconnecting", () => {
      // optional: cleanup empty rooms later
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`Ready on http://${hostname}:${port}`);
    });
});
