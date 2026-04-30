"use client";

import { SharedCanvas, type SharedCanvasHandle } from "@/components/SharedCanvas";
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
import { useCallback, useEffect, useRef, useState } from "react";

type AIGuessResult = {
  success: boolean;
  model: string;
  secretWord: string;
  debug: {
    visionPrompt: string;
    visionResponse: string;
    comparePrompt: string;
    compareResponse: string;
  };
  result: {
    aiGuess: string;
    isMatch: boolean;
    comparison: string;
  };
};

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

  const canvasRef = useRef<SharedCanvasHandle>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIGuessResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

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
        setAiResult(null);
        setAiError(null);
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
    setAiResult(null);
    setAiError(null);
  };

  const newRound = () => {
    const s = getSocket();
    emitNewRound(s, roomId);
  };

  const handleAIGuess = async () => {
    if (!canvasRef.current) {
      setAiError("无法获取画布");
      return;
    }

    const targetWord = submittedWord || secretWord;
    if (!targetWord.trim()) {
      setAiError("请先设置本局词语");
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const imageData = canvasRef.current.toDataURL();

      const response = await fetch("/api/ai-guess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData,
          secretWord: targetWord.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "AI 猜词失败");
      }

      setAiResult(data);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setAiLoading(false);
    }
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
        ref={canvasRef}
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
          onClick={handleAIGuess}
          disabled={aiLoading}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {aiLoading ? "AI 猜测中…" : "完成，让 AI 猜"}
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

      {aiError && (
        <div className="mt-6 rounded-lg border border-red-600/50 bg-red-950/40 px-4 py-3 text-red-200">
          <p className="font-medium">错误</p>
          <p className="text-sm mt-1">{aiError}</p>
        </div>
      )}

      {aiResult && (
        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/80 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-100">AI 猜词结果</h3>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                aiResult.result.isMatch
                  ? "bg-emerald-900/50 text-emerald-300"
                  : "bg-amber-900/50 text-amber-300"
              }`}
            >
              {aiResult.result.isMatch ? "✓ 猜对了！" : "✗ 没猜对"}
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">预设答案</p>
                <p className="text-slate-200 font-medium">{aiResult.secretWord}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">AI 猜测</p>
                <p className="text-slate-200 font-medium">{aiResult.result.aiGuess}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDebug(!showDebug)}
              className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              {showDebug ? "▼ 隐藏调试信息" : "▶ 显示调试信息（Prompt & Response）"}
            </button>

            {showDebug && (
              <div className="space-y-4 pt-2">
                <div className="rounded-lg bg-slate-950 border border-slate-700 p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                    模型: {aiResult.model}
                  </p>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    第一次调用（图生文）- Prompt
                  </p>
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900 p-2 rounded border border-slate-800">
                    {aiResult.debug.visionPrompt}
                  </pre>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mt-3 mb-1">
                    第一次调用 - Response
                  </p>
                  <pre className="text-sm text-emerald-400 whitespace-pre-wrap bg-slate-900 p-2 rounded border border-slate-800">
                    {aiResult.debug.visionResponse}
                  </pre>
                </div>

                <div className="rounded-lg bg-slate-950 border border-slate-700 p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    第二次调用（文本对比）- Prompt
                  </p>
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900 p-2 rounded border border-slate-800">
                    {aiResult.debug.comparePrompt}
                  </pre>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mt-3 mb-1">
                    第二次调用 - Response
                  </p>
                  <pre className="text-sm text-emerald-400 whitespace-pre-wrap bg-slate-900 p-2 rounded border border-slate-800">
                    {aiResult.debug.compareResponse}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
