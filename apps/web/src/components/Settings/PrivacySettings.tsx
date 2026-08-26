import { useSettingsStore } from '@/store/settingsStore';
import { Lock, Shield, UserPlus, Users } from 'lucide-react';

export default function PrivacySettings() {
  const { preferences, updatePreferences } = useSettingsStore();
  if (!preferences) return null;

  const friendRequestPolicy = preferences.friendRequestPolicy || 'EVERYONE';

  return (
    <div className="max-w-3xl pb-12 text-white">
      <div className="mb-7">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">Conta</p>
        <h2 className="text-2xl font-black tracking-[-0.03em]">Privacidade e Segurança</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Ajustes que deixam o app com cara de comunidade séria, não de protótipo.</p>
      </div>

      <section className="rounded-[24px] border border-cyan-400/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-400/10 p-2 text-emerald-300"><Shield size={20} /></div>
          <div>
            <h3 className="font-semibold text-white">Convites e mensagens</h3>
            <p className="text-sm text-slate-400">Quem pode chegar até você e por qual caminho.</p>
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pedidos de amizade</span>
          <select
            value={friendRequestPolicy}
            onChange={(event) => updatePreferences({ friendRequestPolicy: event.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/35 p-3 text-sm text-white outline-none focus:border-cyan-400/30"
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
        </div>
      </section>
    </div>
  );
}
