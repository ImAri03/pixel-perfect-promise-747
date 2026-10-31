import { X } from "lucide-react";

export function Drawer({ open, onClose, title, children }) {
  return (
    <div className={`fixed inset-0 z-50 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}>
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <aside className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-card shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-xl">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </div>
  );
}
