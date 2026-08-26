import { useSettingsStore } from '@/store/settingsStore';
import { Lock, Shield, UserPlus, Users } from 'lucide-react';

export default function PrivacySettings() {
  const { preferences, updatePreferences } = useSettingsStore();
  if (!preferences) return null;

  const friendRequestPolicy = preferences.friendRequestPolicy || 'EVERYONE';

  return (
    <div className="max-w-3xl pb-12 text-white">
      <div className="mb-7">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[#5865F2]">Conta</p>
        <h2 className="text-2xl font-bold">Privacidade e Segurança</h2>
        <p className="mt-2 text-sm leading-6 text-[#B5BAC1]">Ajustes que deixam o app com cara de comunidade séria, não de protótipo.</p>
      </div>

      <section className="rounded-xl border border-[#3F4147] bg-[#2B2D31] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-[#23A559]/15 p-2 text-[#23A559]"><Shield size={20} /></div>
          <div>
            <h3 className="font-semibold text-[#F2F3F5]">Convites e mensagens</h3>
            <p className="text-sm text-[#949BA4]">Quem pode chegar até você e por qual caminho.</p>
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#B5BAC1]">Pedidos de amizade</span>
          <select
            value={friendRequestPolicy}
            onChange={(event) => updatePreferences({ friendRequestPolicy: event.target.value })}
            className="w-full rounded-lg border border-[#111214] bg-[#1E1F22] p-3 text-sm text-[#F2F3F5]"
          >
            <option value="EVERYONE">Todos</option>
            <option value="FRIENDS_OF_FRIENDS">Amigos de amigos</option>
            <option value="SERVER_MEMBERS">Membros de servidores em comum</option>
            <option value="NOBODY">Ninguém</option>
          </select>
        </label>

        <div className="mt-4 space-y-2">
          {[
            {
              key: 'allowServerDMs',
              label: 'Permitir DMs de servidor',
              desc: 'Facilita a conversa sem precisar sair da comunidade.',
              icon: Users,
            },
            {
              key: 'reducedMotion',
              label: 'Reduzir animações',
              desc: 'Uma interface mais calma e menos distração visual.',
              icon: Lock,
            },
            {
              key: 'desktopNotifications',
              label: 'Notificações de desktop',
              desc: 'Recebe alertas mesmo longe da aba atual.',
              icon: UserPlus,
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
        </div>
      </section>
    </div>
  );
}
