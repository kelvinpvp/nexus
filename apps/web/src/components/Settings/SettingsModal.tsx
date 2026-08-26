import React, { useState } from 'react';
import { Bell, Monitor, Palette, Shield, User, UserRound, Volume2, X } from 'lucide-react';
import AccountSettings from './AccountSettings';
import AppearanceSettings from './AppearanceSettings';
import NotificationSettings from './NotificationSettings';
import PrivacySettings from './PrivacySettings';
import VoiceSettings from './VoiceSettings';
import ProfileSettings from './ProfileSettings';

interface SettingsModalProps {
  onClose: () => void;
  initialTab?: string;
}

const SETTINGS_SECTIONS = [
  {
    header: 'USUÁRIO',
    items: [
      { id: 'account', label: 'Minha Conta', component: AccountSettings },
      { id: 'profile', label: 'Perfil', component: ProfileSettings },
      { id: 'privacy', label: 'Privacidade e Segurança', component: PrivacySettings },
    ]
  },
  {
    header: 'APLICATIVO',
    items: [
      { id: 'voice', label: 'Voz e Vídeo', component: VoiceSettings },
      { id: 'appearance', label: 'Aparência', component: AppearanceSettings },
      { id: 'notifications', label: 'Notificações', component: NotificationSettings },
    ]
  }
];

export default function SettingsModal({ onClose, initialTab = 'account' }: SettingsModalProps) {
  const [activeTabId, setActiveTabId] = useState(initialTab);
  const itemIcons: Record<string, React.ElementType> = {
    account: UserRound,
    profile: User,
    privacy: Shield,
    voice: Volume2,
    appearance: Palette,
    notifications: Bell,
  };

  // Find the active component
  let ActiveComponent = null;
  for (const section of SETTINGS_SECTIONS) {
    const item = section.items.find(i => i.id === activeTabId);
    if (item && item.component) {
      ActiveComponent = item.component;
      break;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200 bg-slate-950/80 backdrop-blur-md">
      {/* Sidebar */}
      <div className="flex w-[30%] min-w-[240px] max-w-[320px] justify-end border-r border-cyan-400/10 bg-gradient-to-b from-[#07101E] via-[#0B1222] to-[#070B14]">
        <div className="flex w-full max-w-[270px] flex-col gap-5 px-4 py-12">
          <div className="px-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/70">Nexus</p>
            <h2 className="mt-2 text-[20px] font-black tracking-[-0.03em] text-white">Configurações</h2>
          </div>
          {SETTINGS_SECTIONS.map((section, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <h3 className="mb-1 px-3 text-[11px] font-semibold tracking-[0.2em] text-slate-500">{section.header}</h3>
              {section.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTabId(item.id)}
                  className={`mx-1 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-[15px] font-semibold transition-all ${
                    activeTabId === item.id
                      ? 'border border-cyan-400/20 bg-cyan-400/10 text-white shadow-[0_8px_30px_rgba(34,211,238,0.12)]'
                      : 'text-slate-300 hover:border hover:border-white/5 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {React.createElement(itemIcons[item.id] || Monitor, { size: 17 })}
                  {item.label}
                </button>
              ))}
              {idx < SETTINGS_SECTIONS.length - 1 && <div className="mx-3 my-3 h-px bg-white/8" />}
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="relative flex flex-1 justify-start bg-gradient-to-br from-[#0B1020] via-[#10162A] to-[#070B14]">
        <div className="h-full w-full max-w-[840px] overflow-y-auto px-10 py-12">
          {ActiveComponent ? <ActiveComponent /> : null}
        </div>

        {/* Close Button */}
        <div className="absolute right-10 top-12 flex flex-col items-center">
          <button
            onClick={onClose}
            className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
          <span className="text-[13px] font-semibold tracking-[0.2em] text-slate-500">ESC</span>
        </div>
      </div>
    </div>
  );
}
