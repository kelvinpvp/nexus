import { useSettingsStore } from '@/store/settingsStore';
import { Bell, MessageSquare, Volume2 } from 'lucide-react';

export default function NotificationSettings() {
  const { preferences, updatePreferences } = useSettingsStore();
  if (!preferences) return null;

  return (
    <div className="max-w-3xl pb-12 text-white">
      <div className="mb-7">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">Alertas</p>
        <h2 className="text-2xl font-black tracking-[-0.03em]">Notificações</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Controle sons, banners e o que merece cutucar sua atenção.</p>
      </div>

      <section className="rounded-[24px] border border-cyan-400/10 bg-white/[0.03] p-2">
        {[
          {
            key: 'notificationSounds',
            label: 'Sons de notificação',
            desc: 'Toca sons para mensagens, convites e eventos importantes.',
            icon: Volume2,
          },
          {
            key: 'desktopNotifications',
            label: 'Notificações do sistema',
            desc: 'Mostra banners na área de trabalho quando o app estiver em segundo plano.',
            icon: Bell,
          },
          {
            key: 'allowServerDMs',
            label: 'Mensagens diretas de servidores',
            desc: 'Permite que membros te enviem DM a partir de servidores.',
            icon: MessageSquare,
          },
        ].map((item) => {
          const Icon = item.icon;
          const checked = !!(preferences as any)[item.key];
          return (
            <button
              key={item.key}
              type="button"
              role="switch"
              aria-checked={checked}
              onClick={() => updatePreferences({ [item.key]: !checked } as any)}
              className="flex w-full items-center justify-between gap-5 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/5"
              >
                <span className="flex items-start gap-3">
                <span className="mt-0.5 rounded-2xl bg-cyan-400/10 p-2 text-cyan-300"><Icon size={18} /></span>
                <span>
                  <span className="block text-[15px] font-medium text-white">{item.label}</span>
                  <span className="mt-0.5 block text-sm leading-5 text-slate-400">{item.desc}</span>
                </span>
              </span>
              <span className={'relative h-6 w-11 shrink-0 rounded-full transition-colors ' + (checked ? 'bg-emerald-400' : 'bg-slate-600')}>
                <span className={'absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-all ' + (checked ? 'translate-x-5' : '')} />
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
