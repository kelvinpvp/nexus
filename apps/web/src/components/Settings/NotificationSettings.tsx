import { useSettingsStore } from '@/store/settingsStore';
import { Bell, MessageSquare, Volume2 } from 'lucide-react';

export default function NotificationSettings() {
  const { preferences, updatePreferences } = useSettingsStore();
  if (!preferences) return null;

  return (
    <div className="max-w-3xl pb-12 text-white">
      <div className="mb-7">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[#5865F2]">Alertas</p>
        <h2 className="text-2xl font-bold">Notificações</h2>
        <p className="mt-2 text-sm leading-6 text-[#B5BAC1]">Controle sons, banners e o que merece cutucar sua atenção.</p>
      </div>

      <section className="rounded-xl border border-[#3F4147] bg-[#2B2D31] p-2">
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
              className="flex w-full items-center justify-between gap-5 rounded-lg px-3 py-3 text-left transition-colors hover:bg-[#35373C]"
            >
              <span className="flex items-start gap-3">
                <span className="mt-0.5 rounded-lg bg-[#5865F2]/15 p-2 text-[#8B95FF]"><Icon size={18} /></span>
                <span>
                  <span className="block text-[15px] font-medium text-[#F2F3F5]">{item.label}</span>
                  <span className="mt-0.5 block text-sm leading-5 text-[#949BA4]">{item.desc}</span>
                </span>
              </span>
              <span className={'relative h-6 w-11 shrink-0 rounded-full transition-colors ' + (checked ? 'bg-[#23A559]' : 'bg-[#4E5058]')}>
                <span className={'absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-all ' + (checked ? 'translate-x-5' : '')} />
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
