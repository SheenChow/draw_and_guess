"use client";

import { SharedCanvas } from "@/components/SharedCanvas";
import {
  bindGameSocket,
  emitClearCanvas,
  emitNewRound,
  emitSetSecretWord,
  emitStroke,
  getSocket,
} from "@/lib/socket";
import type { Stroke } from "@/types/game";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function DrawPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [connected, setConnected] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [secretWord, setSecretWordInput] = useState("");
  const [submittedWord, setSubmittedWord] = useState("");
  const [roundWon, setRoundWon] = useState(false);
  const [color, setColor] = useState("#f472b6");
  const [brush, setBrush] = useState(3);

  useEffect(() => {
    const s = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    setConnected(s.connected);
    const unbind = bindGameSocket(s, roomId, "drawer", {
      onRoomStateDrawer: (state) => {
        setStrokes(state.strokes);
        setSubmittedWord(state.secretWord);
        setSecretWordInput(state.secretWord);
        setRoundWon(state.roundWon);
      },
      onStroke: (stroke) => setStrokes((prev) => [...prev, stroke]),
      onCanvasCleared: () => setStrokes([]),
      onRoundWon: () => setRoundWon(true),
      onNewRound: () => {
        setStrokes([]);
        setRoundWon(false);
        setSubmittedWord("");
        setSecretWordInput("");
      },
    });
    s.emit("join-room", { roomId, role: "drawer" });
    return () => {
      unbind();
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, [roomId]);

  const onStroke = useCallback(
    (stroke: Stroke) => {
      const s = getSocket();
      setStrokes((prev) => [...prev, stroke]);
      emitStroke(s, roomId, stroke);
    },
    [roomId]
  );

  const applyWord = () => {
    const s = getSocket();
    emitSetSecretWord(s, roomId, secretWord);
    setSubmittedWord(secretWord.trim());
  };

  const clear = () => {
    const s = getSocket();
    setStrokes([]);
    emitClearCanvas(s, roomId);
  };

  const newRound = () => {
    const s = getSocket();
    emitNewRound(s, roomId);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">画手</h1>
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
          href={`/room/${roomId}/guess`}
          className="text-sm text-sky-400 hover:underline"
        >
          猜词页链接（发给对手）→
        </Link>
      </div>

      {roundWon && (
        <div className="mb-4 rounded-lg border border-emerald-600/50 bg-emerald-950/40 px-4 py-3 text-emerald-200">
          对方猜对了！可以点击「新一局」继续。
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
            本局词语（仅你可见）
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              value={secretWord}
              onChange={(e) => setSecretWordInput(e.target.value)}
              placeholder="例如：苹果"
            />
            <button
              type="button"
              onClick={applyWord}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
            >
              确定
            </button>
          </div>
          {submittedWord ? (
            <p className="mt-2 text-xs text-slate-500">
              当前词：<span className="text-slate-300">{submittedWord}</span>
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
            画笔
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-slate-600 bg-transparent"
              aria-label="颜色"
            />
            <input
              type="range"
              min={1}
              max={24}
              value={brush}
              onChange={(e) => setBrush(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-slate-400">{brush}px</span>
          </div>
        </div>
      </div>

      <SharedCanvas
        strokes={strokes}
        readOnly={false}
        color={color}
        lineWidth={brush / 100}
        onStroke={onStroke}
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={clear}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          清空画布
        </button>
        <button
          type="button"
          onClick={newRound}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
        >
          新一局
        </button>
        <Link href="/" className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200">
          返回首页
        </Link>
      </div>
    </div>
  );
}
