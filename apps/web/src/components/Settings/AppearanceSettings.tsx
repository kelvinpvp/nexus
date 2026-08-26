import { useSettingsStore } from '@/store/settingsStore';
import { MoonStar, Monitor, Palette, Sparkles } from 'lucide-react';

export default function AppearanceSettings() {
  const { preferences, updatePreferences } = useSettingsStore();
  if (!preferences) return null;

  return (
    <div className="max-w-3xl pb-12 text-white">
      <div className="mb-7">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[#5865F2]">Interface</p>
        <h2 className="text-2xl font-bold">Aparência</h2>
        <p className="mt-2 text-sm leading-6 text-[#B5BAC1]">Ajustes visuais e densidade para deixar o Nexus com mais cara de produto acabado.</p>
      </div>

      <section className="rounded-xl border border-[#3F4147] bg-[#2B2D31] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-[#5865F2]/15 p-2 text-[#8B95FF]"><Palette size={20} /></div>
          <div>
            <h3 className="font-semibold text-[#F2F3F5]">Tema</h3>
            <p className="text-sm text-[#949BA4]">Mantive só o dark por enquanto, mas já deixei a base pronta para expansão.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => updatePreferences({ theme: 'dark' })}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left ${preferences.theme === 'dark' ? 'border-[#5865F2] bg-[#1E1F22]' : 'border-[#3F4147] bg-[#1E1F22]/60'}`}
          >
            <span>
              <span className="block font-medium text-[#F2F3F5]">Escuro</span>
              <span className="block text-sm text-[#949BA4]">Bem próximo do padrão visual do Discord.</span>
            </span>
            <MoonStar size={18} className="text-[#8B95FF]" />
          </button>
          <button
            type="button"
            disabled
            className="flex items-center justify-between rounded-lg border border-[#3F4147] bg-[#1E1F22]/40 px-4 py-3 text-left opacity-60"
          >
            <span>
              <span className="block font-medium text-[#F2F3F5]">Claro</span>
              <span className="block text-sm text-[#949BA4]">Deixei travado por enquanto.</span>
            </span>
            <Monitor size={18} className="text-[#949BA4]" />
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-[#3F4147] bg-[#2B2D31] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-[#F0B232]/15 p-2 text-[#F0B232]"><Sparkles size={20} /></div>
          <div>
            <h3 className="font-semibold text-[#F2F3F5]">Densidade de mensagens</h3>
            <p className="text-sm text-[#949BA4]">Isso prepara a tela para uma leitura mais compacta ou confortável.</p>
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
              className={`rounded-lg border px-4 py-3 text-left ${preferences.messageDisplay === value ? 'border-[#5865F2] bg-[#1E1F22]' : 'border-[#3F4147] bg-[#1E1F22]/60'}`}
            >
              <span className="block font-medium text-[#F2F3F5]">{label}</span>
              <span className="block text-sm text-[#949BA4]">{value === 'cozy' ? 'Mais respiro entre as mensagens.' : 'Mais informação na mesma tela.'}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
