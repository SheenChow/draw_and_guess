import { CreateRoomPanel } from "@/components/CreateRoomPanel";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-10 px-6 py-16">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-100">
          你画我猜
        </h1>
        <p className="text-slate-400">
          双人实时同步：一人打开「画手」页作画并设置词语，另一人打开「猜词」页观看画板并输入答案。
        </p>
      </div>

      <CreateRoomPanel />
    </main>
  );
}
