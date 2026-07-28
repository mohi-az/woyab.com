import { FiLoader } from "react-icons/fi";

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-[28px] bg-white p-8 shadow-sm border border-slate-200">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <FiLoader className="animate-spin text-4xl text-primary" />
      </div>
    </div>
  );
}
