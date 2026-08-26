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
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200 bg-[#000000]/80">
      {/* Sidebar */}
      <div className="flex w-[30%] min-w-[220px] max-w-[300px] justify-end bg-[#232428]">
        <div className="flex w-full max-w-[250px] flex-col gap-5 px-3 py-12">
          <div className="px-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#949BA4]">Nexus</p>
            <h2 className="mt-1 text-lg font-bold text-white">Configurações</h2>
          </div>
          {SETTINGS_SECTIONS.map((section, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <h3 className="mb-1 px-3 text-[11px] font-bold text-[#949BA4]">{section.header}</h3>
              {section.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTabId(item.id)}
                  className={`mx-1 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[15px] font-medium transition-colors ${
                    activeTabId === item.id
                      ? 'bg-[#404249] text-white shadow-sm'
                      : 'text-[#B5BAC1] hover:bg-[#303136] hover:text-[#DBDEE1]'
                  }`}
                >
                  {React.createElement(itemIcons[item.id] || Monitor, { size: 17 })}
                  {item.label}
                </button>
              ))}
              {idx < SETTINGS_SECTIONS.length - 1 && <div className="mx-3 my-3 h-px bg-[#3F4147]" />}
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="relative flex flex-1 justify-start bg-[#313338]">
        <div className="h-full w-full max-w-[840px] overflow-y-auto px-10 py-12">
          {ActiveComponent ? <ActiveComponent /> : null}
        </div>

        {/* Close Button */}
        <div className="absolute right-10 top-12 flex flex-col items-center">
          <button
            onClick={onClose}
            className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#949BA4] text-[#949BA4] transition-colors hover:bg-[#3F4147]"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
          <span className="text-[13px] font-bold text-[#949BA4]">ESC</span>
        </div>
      </div>
    </div>
  );
}
