// ══════════════════════════════════════════════════════════════════
// UserDrawingPanel.tsx — شريط "رسوماتي" + نافذة "إضافة رسمة كود"
// مكوّنان مشتركان بين قارئ المحاضرات والسبورة الذكية
// ══════════════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import type { UserDrawing } from "../types";
import { sanitizeSvg, uid, validateSvg } from "../utils/userDrawings";

interface UserDrawingsBarProps {
  drawings: UserDrawing[]; // خاصة (المحاضرة الحالية)
  publicDrawings: UserDrawing[]; // عامة (كل المحاضرات)
  publicOpen: boolean;
  onTogglePublic: () => void;
  onPick: (d: UserDrawing) => void;
  onAdd: () => void;
  onDelete?: (id: string, scope: "private" | "public") => void;
}

/**
 * الشريط العلوي: رسمات خاصة + رسمات عامة (قابلة للطي) + زر إضافة.
 * الضغط على أي رسمة يعرضها على السبورة.
 */
export function UserDrawingsBar(props: UserDrawingsBarProps) {
  const { drawings, publicDrawings, publicOpen, onTogglePublic, onPick, onAdd, onDelete } = props;
  const total = (drawings?.length || 0) + (publicDrawings?.length || 0);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-black text-amber-300 truncate">
          🖼️ رسوماتي — اضغط أي رسمة لعرضها على السبورة
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onAdd}
            className="px-2 py-1 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/50 text-[10px] font-bold transition"
          >
            ➕ إضافة رسمة كود
          </button>
          <button
            onClick={onTogglePublic}
            className="px-2 py-1 rounded-lg bg-white/5 border border-white/15 text-slate-300 hover:bg-white/15 text-[10px] font-bold transition"
          >
            {publicOpen ? "▲" : "▼"} عامة ({publicDrawings?.length || 0})
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {total === 0 && (
          <span className="text-[10px] text-slate-500">
            لا رسومات بعد — أضف رسمة كود SVG لتحضير محاضرتك مسبقاً
          </span>
        )}
        {(drawings || []).map((d) => (
          <DrawChip
            key={d.id}
            d={d}
            tag="خاصة"
            tagClass="bg-amber-500/90"
            onPick={onPick}
            onDelete={onDelete ? () => onDelete(d.id, "private") : undefined}
          />
        ))}
        {publicOpen &&
          (publicDrawings || []).map((d) => (
            <DrawChip
              key={d.id}
              d={d}
              tag="عامة"
              tagClass="bg-violet-500/90"
              onPick={onPick}
              onDelete={onDelete ? () => onDelete(d.id, "public") : undefined}
            />
          ))}
      </div>
    </div>
  );
}

function DrawChip(props: {
  key?: React.Key;
  d: UserDrawing;
  tag: string;
  tagClass: string;
  onPick: (d: UserDrawing) => void;
  onDelete?: () => void;
}) {
  const { d, tag, tagClass, onPick, onDelete } = props;
  return (
    <div className="group flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-2.5 hover:bg-white/15 hover:border-white/30 transition">
      <button
        onClick={() => onPick(d)}
        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-200 hover:text-white transition"
        title={d.name}
      >
        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full text-white ${tagClass}`}>{tag}</span>
        <span className="max-w-[120px] truncate">{d.name}</span>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-[11px] font-black transition"
          title="حذف"
        >
          ✕
        </button>
      )}
    </div>
  );
}

interface AddDrawingDialogProps {
  onClose: () => void;
  onSave: (d: UserDrawing) => void;
  initialName?: string;
  allowPrivate?: boolean; // false ⇒ تُحفظ عامة دائماً (حالة السبورة الذكية)
}

/**
 * نافذة إضافة رسمة كود: اسم + كلمات مفتاحية + نوع حفظ + كود SVG + معاينة فورية
 */
export function AddDrawingDialog(props: AddDrawingDialogProps) {
  const { onClose, onSave, initialName = "", allowPrivate = true } = props;
  const [name, setName] = useState(initialName);
  const [keywords, setKeywords] = useState("");
  const [scope, setScope] = useState<"private" | "public">(allowPrivate ? "private" : "public");
  const [svg, setSvg] = useState("");
  const [svgError, setSvgError] = useState("");

  useEffect(() => {
    setSvgError(validateSvg(svg) ? "" : svg.trim() ? "⚠️ كود SVG غير صالح — تحقق من الأوسمة" : "");
  }, [svg]);

  const submit = () => {
    if (!name.trim() || !svg.trim() || svgError) return;
    onSave({
      id: uid("ud"),
      name: name.trim(),
      keywords: keywords.split(/[,،]/).map((k) => k.trim()).filter(Boolean),
      svg: sanitizeSvg(svg),
      createdAt: new Date().toISOString(),
      scope,
    });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" dir="rtl">
      <div className="bg-[#0f0f1e] border border-white/10 rounded-3xl p-5 w-[460px] max-w-[94vw] max-h-[92vh] overflow-y-auto shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-white">➕ إضافة رسمة كود</p>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition text-sm font-black">✕</button>
        </div>

        <div>
          <label className="text-[11px] text-slate-300 font-bold block mb-1">اسم الرسمة</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: دائرة شحن مكثف"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="text-[11px] text-slate-300 font-bold block mb-1">كلمات مفتاحية (مفصولة بفاصلة) — للاختيار التلقائي</label>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="شحن مكثف, RC, capacitor charging"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {allowPrivate && (
          <div>
            <label className="text-[11px] text-slate-300 font-bold block mb-1">نوع الحفظ</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setScope("private")}
                className={`py-2 rounded-xl text-[11px] font-bold border transition ${scope === "private" ? "bg-amber-600 border-amber-500 text-white" : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"}`}
              >
                🔒 خاصة — هذه المحاضرة
              </button>
              <button
                onClick={() => setScope("public")}
                className={`py-2 rounded-xl text-[11px] font-bold border transition ${scope === "public" ? "bg-violet-600 border-violet-500 text-white" : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"}`}
              >
                🌐 عامة — كل المحاضرات
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="text-[11px] text-slate-300 font-bold block mb-1">كود SVG</label>
          <textarea
            value={svg}
            onChange={(e) => setSvg(e.target.value)}
            rows={7}
            dir="ltr"
            placeholder={'<svg viewBox="0 0 560 400" xmlns="http://www.w3.org/2000/svg">\n  <rect width="560" height="400" fill="#fbfcfe"/>\n  <line x1="110" y1="120" x2="450" y2="120" stroke="#1e293b" stroke-width="2.5"/>\n</svg>'}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-mono text-emerald-300 placeholder-slate-700 outline-none focus:ring-1 focus:ring-amber-500 resize-y"
          />
          {svgError && <p className="text-[10px] text-red-400 mt-1">{svgError}</p>}
        </div>

        <div>
          <label className="text-[11px] text-slate-300 font-bold block mb-1">معاينة فورية</label>
          <div className="w-full min-h-[130px] rounded-xl border border-white/10 bg-white overflow-hidden flex items-center justify-center p-2">
            {svg.trim() ? (
              <div className="w-full max-w-[320px]" dangerouslySetInnerHTML={{ __html: sanitizeSvg(svg) }} />
            ) : (
              <span className="text-[10px] text-slate-500">ستظهر المعاينة هنا أثناء الكتابة</span>
            )}
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!name.trim() || !svg.trim() || !!svgError}
          className="w-full py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white transition"
        >
          💾 حفظ في المكتبة
        </button>
      </div>
    </div>
  );
}

export default UserDrawingsBar;
