"use client";

import { SharedCanvas } from "@/components/SharedCanvas";
import {
  bindGameSocket,
  emitSubmitGuess,
  getSocket,
} from "@/lib/socket";
import type { Stroke } from "@/types/game";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function GuessPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [connected, setConnected] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [roundWon, setRoundWon] = useState(false);

  useEffect(() => {
    const s = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    setConnected(s.connected);

    const unbind = bindGameSocket(s, roomId, "guesser", {
      onRoomStateGuesser: (state) => {
        setStrokes(state.strokes);
        setRoundWon(state.roundWon);
      },
      onStroke: (stroke) => setStrokes((prev) => [...prev, stroke]),
      onCanvasCleared: () => setStrokes([]),
      onRoundWon: () => {
        setRoundWon(true);
        setFeedback("有人猜对了！");
      },
      onNewRound: () => {
        setStrokes([]);
        setRoundWon(false);
        setGuess("");
        setFeedback("新的一局开始");
      },
      onGuessResult: (p) => {
        setFeedback(p.message);
        if (p.ok) setRoundWon(true);
      },
    });

    s.emit("join-room", { roomId, role: "guesser" });

    return () => {
      unbind();
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, [roomId]);

  const submit = () => {
    const s = getSocket();
    setFeedback(null);
    emitSubmitGuess(s, roomId, guess);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">猜词</h1>
          <p className="text-sm text-slate-500">
            房间 <span className="font-mono text-slate-400">{roomId}</span> ·{" "}
            {connected ? (
              <span className="text-emerald-400">已连接</span>
            ) : (
              <span className="text-amber-400">连接中…</span>
            )}
          </p>
        </div>
        <Link
          href={`/room/${roomId}/draw`}
          className="text-sm text-sky-400 hover:underline"
        >
          画手页 →
        </Link>
      </div>

      <p className="mb-4 text-sm text-slate-400">
        此页面仅显示共享画布（只读）。根据画的内容输入词语。
      </p>

      {roundWon && (
        <div className="mb-4 rounded-lg border border-emerald-600/50 bg-emerald-950/40 px-4 py-3 text-emerald-200">
          本局已猜对，等待画手开始新一局。
        </div>
      )}

      <SharedCanvas
        strokes={strokes}
        readOnly
        color="#94a3b8"
        lineWidth={0.02}
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-slate-500">你的猜测</label>
          <input
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="输入词语后回车或点击提交"
            disabled={roundWon}
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={roundWon}
          className="rounded-lg bg-sky-500 px-6 py-2 font-medium text-white hover:bg-sky-400 disabled:opacity-50"
        >
          提交
        </button>
      </div>

      {feedback ? (
        <p className="mt-3 text-sm text-slate-300">{feedback}</p>
      ) : null}

      <Link
        href="/"
        className="mt-8 inline-block text-sm text-slate-400 hover:text-slate-200"
      >
        ← 返回首页
      </Link>
    </div>
  );
}
