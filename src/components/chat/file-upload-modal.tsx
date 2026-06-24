"use client";

import { useState, useRef, useEffect } from "react";
import { X, Plus, Send, FileText, Loader2 } from "lucide-react";

interface Props {
  initialFiles: File[];
  onClose: () => void;
  onSend: (files: File[], caption: string) => Promise<void> | void;
  maxFiles?: number;
}

function isImage(f: File) {
  return f.type.startsWith("image/");
}

export function FileUploadModal({
  initialFiles,
  onClose,
  onSend,
  maxFiles = 10,
}: Props) {
  const [files, setFiles] = useState<File[]>(initialFiles.slice(0, maxFiles));
  const [active, setActive] = useState(0);
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // URLs de preview pras imagens (revoga ao desmontar)
  const [urls, setUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    const map: Record<number, string> = {};
    files.forEach((f, i) => {
      if (isImage(f)) map[i] = URL.createObjectURL(f);
    });
    setUrls(map); // eslint-disable-line react-hooks/set-state-in-effect
    return () => Object.values(map).forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function addMore(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, maxFiles));
  }
  function removeAt(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setActive(0);
  }

  async function handleSend() {
    if (!files.length || sending) return;
    setSending(true);
    try {
      await onSend(files, caption.trim());
      onClose();
    } finally {
      setSending(false);
    }
  }

  const current = files[active];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Adicionar arquivos
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview do arquivo ativo */}
        {current && (
          <div className="mb-3 text-center">
            <p className="mb-2 truncate text-sm text-gray-700">
              {current.name}
            </p>
            {isImage(current) && urls[active] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urls[active]}
                alt={current.name}
                className="mx-auto max-h-52 rounded-lg object-contain"
              />
            ) : (
              <FileText className="mx-auto h-16 w-16 text-indigo-500" />
            )}
          </div>
        )}

        {/* Legenda */}
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Escreva uma mensagem (opcional)"
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSend();
          }}
          className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />

        {/* Miniaturas + adicionar mais */}
        <div className="mb-1 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border ${
                i === active
                  ? "border-indigo-500 ring-1 ring-indigo-400"
                  : "border-gray-200"
              }`}
            >
              {isImage(f) && urls[i] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urls[i]}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <FileText className="h-6 w-6 text-indigo-500" />
              )}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
                className="absolute right-0 top-0 hidden rounded-bl bg-black/60 px-1 text-[10px] text-white group-hover:block"
              >
                ✕
              </span>
            </button>
          ))}
          {files.length < maxFiles && (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex h-14 w-14 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addMore(e.target.files)}
          />
        </div>
        <p className="mb-4 text-center text-xs text-gray-400">
          {files.length}/{maxFiles} arquivos
        </p>

        <button
          onClick={handleSend}
          disabled={!files.length || sending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Enviar
        </button>
      </div>
    </div>
  );
}
