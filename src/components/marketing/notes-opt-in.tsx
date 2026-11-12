"use client";

export function NotesOptIn({
  id,
  checked,
  onChange,
  tone = "light",
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tone?: "light" | "dark";
}) {
  const text = tone === "dark" ? "text-slate-300" : "text-text-secondary";
  return (
    <label htmlFor={id} className={`flex items-start gap-2 font-body text-[13px] leading-snug ${text}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0"
      />
      <span>Send me the short notes too</span>
    </label>
  );
}
