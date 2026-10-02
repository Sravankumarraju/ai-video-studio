"use client";
import { Clapperboard, X } from "lucide-react";
// Shared by the studio editor and the devotional project pages.
export async function api<T = unknown>(
  url: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const r = await fetch(`/api/${url}`, {
    method,
    headers:
      data instanceof FormData
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),
  });
  const b = await r.json();
  if (!r.ok) throw Error(b.error || "Request failed");
  return b;
}
export function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      className={secondary ? "btn secondary" : "btn"}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Clapperboard size={32} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="scrim">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon" aria-label="Close dialog" onClick={onClose}>
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
