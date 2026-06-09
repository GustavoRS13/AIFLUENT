"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X, Loader2 } from "lucide-react";

interface TemplateComponent {
  type: string;
  text?: string;
}
interface Template {
  name: string;
  language: string;
  category: string;
  status: string;
  components: TemplateComponent[];
}

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: {
    templateName: string;
    languageCode: string;
    params: string[];
    preview: string;
  }) => void;
}

function bodyText(t: Template): string {
  const b = t.components?.find((c) => (c.type || "").toUpperCase() === "BODY");
  return b?.text || "";
}
function countParams(text: string): number {
  const m = text.match(/\{\{\s*\d+\s*\}\}/g);
  return m ? new Set(m).size : 0;
}

export function TemplatePicker({ open, onClose, onSend }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Template | null>(null);
  const [params, setParams] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSelected(null);
    fetch("/api/whatsapp/templates")
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.templates || []);
        if (d.error) setError(d.error);
      })
      .catch(() => setError("Falha ao carregar templates"))
      .finally(() => setLoading(false));
  }, [open]);

  function pick(t: Template) {
    setSelected(t);
    setParams(Array(countParams(bodyText(t))).fill(""));
  }

  function send() {
    if (!selected) return;
    let preview = bodyText(selected);
    params.forEach((p, i) => {
      preview = preview.replace(
        new RegExp(`\\{\\{\\s*${i + 1}\\s*\\}\\}`, "g"),
        p || `{{${i + 1}}}`,
      );
    });
    onSend({
      templateName: selected.name,
      languageCode: selected.language,
      params,
      preview,
    });
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <FileText className="h-4 w-4 text-emerald-600" /> Modelos de
                mensagem (WhatsApp)
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : error ? (
                <p className="text-sm text-rose-600">{error}</p>
              ) : templates.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nenhum template aprovado encontrado.
                </p>
              ) : !selected ? (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <button
                      key={`${t.name}-${t.language}`}
                      onClick={() => pick(t)}
                      className="w-full rounded-xl border border-gray-200 p-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">
                          {t.name}
                        </span>
                        <span className="text-[10px] uppercase text-gray-400">
                          {t.category} · {t.language}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                        {bodyText(t) || "(sem corpo de texto)"}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => setSelected(null)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    ← Voltar
                  </button>
                  <div className="rounded-xl bg-[#d9fdd3] p-3 text-sm text-gray-900 whitespace-pre-wrap">
                    {bodyText(selected)}
                  </div>
                  {params.map((p, i) => (
                    <div key={i}>
                      <label className="text-xs text-gray-500">
                        Variável {`{{${i + 1}}}`}
                      </label>
                      <input
                        value={p}
                        onChange={(e) =>
                          setParams((prev) =>
                            prev.map((x, j) => (j === i ? e.target.value : x)),
                          )
                        }
                        placeholder={`Valor para {{${i + 1}}}`}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                  ))}
                  <button
                    onClick={send}
                    disabled={params.some((p) => !p.trim())}
                    className="w-full rounded-xl bg-[#25d366] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#20bd5a] disabled:opacity-50"
                  >
                    Enviar template
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
