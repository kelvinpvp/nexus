import { useSettingsStore } from '@/store/settingsStore';
import { MoonStar, Monitor, Palette, Sparkles } from 'lucide-react';

export default function AppearanceSettings() {
  const { preferences, updatePreferences } = useSettingsStore();
  if (!preferences) return null;

  return (
    <div className="max-w-3xl pb-12 text-white">
      <div className="mb-7">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">Interface</p>
        <h2 className="text-2xl font-black tracking-[-0.03em]">Aparência</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Ajustes visuais e densidade para deixar o Nexus com mais cara de produto acabado.</p>
      </div>

      <section className="rounded-[24px] border border-cyan-400/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-400/10 p-2 text-cyan-300"><Palette size={20} /></div>
          <div>
            <h3 className="font-semibold text-white">Tema</h3>
            <p className="text-sm text-slate-400">Mantive só o dark por enquanto, mas já deixei a base pronta para expansão.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => updatePreferences({ theme: 'dark' })}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${preferences.theme === 'dark' ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/10 bg-slate-950/35 hover:bg-white/5'}`}
          >
            <span>
              <span className="block font-medium text-white">Escuro</span>
              <span className="block text-sm text-slate-400">Bem próximo do padrão visual do Discord.</span>
            </span>
            <MoonStar size={18} className="text-cyan-300" />
          </button>
          <button
            type="button"
            disabled
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3 text-left opacity-60"
          >
            <span>
              <span className="block font-medium text-white">Claro</span>
              <span className="block text-sm text-slate-400">Deixei travado por enquanto.</span>
            </span>
            <Monitor size={18} className="text-slate-400" />
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-[24px] border border-cyan-400/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-fuchsia-400/10 p-2 text-fuchsia-300"><Sparkles size={20} /></div>
          <div>
            <h3 className="font-semibold text-white">Densidade de mensagens</h3>
            <p className="text-sm text-slate-400">Isso prepara a tela para uma leitura mais compacta ou confortável.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['cozy', 'Conforto'],
            ['compact', 'Compacto'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => updatePreferences({ messageDisplay: value })}
              className={`rounded-2xl border px-4 py-3 text-left transition-all ${preferences.messageDisplay === value ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/10 bg-slate-950/35 hover:bg-white/5'}`}
            >
              <span className="block font-medium text-white">{label}</span>
              <span className="block text-sm text-slate-400">{value === 'cozy' ? 'Mais respiro entre as mensagens.' : 'Mais informação na mesma tela.'}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
