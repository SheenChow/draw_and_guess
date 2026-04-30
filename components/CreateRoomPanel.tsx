"use client";

import Link from "next/link";
import { useMemo } from "react";
import { nanoid } from "nanoid";

export function CreateRoomPanel() {
  const roomId = useMemo(() => nanoid(10), []);

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/50 p-8 shadow-xl backdrop-blur">
      <p className="mb-6 text-center text-sm text-slate-400">
        点击下方创建新房间，把两个链接分别发给两位玩家（需访问同一应用地址以便 WebSocket
        连上同一台服务器）。
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Link
          href={`/room/${roomId}/draw`}
          className="rounded-xl bg-sky-500 px-6 py-3 text-center font-medium text-white shadow hover:bg-sky-400"
        >
          我是画手 →
        </Link>
        <Link
          href={`/room/${roomId}/guess`}
          className="rounded-xl border border-slate-600 bg-slate-800 px-6 py-3 text-center font-medium text-slate-100 hover:bg-slate-700"
        >
          我是猜手 →
        </Link>
      </div>
      <p className="mt-6 break-all text-center text-xs text-slate-500">
        房间 ID：<span className="font-mono text-slate-400">{roomId}</span>
      </p>
    </div>
  );
}
