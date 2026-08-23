import React, { useState } from 'react';
import { X } from 'lucide-react';
import AccountSettings from './AccountSettings';
import VoiceSettings from './VoiceSettings';

interface SettingsModalProps {
  onClose: () => void;
  initialTab?: string;
}

const SETTINGS_SECTIONS = [
  {
    header: 'USUÁRIO',
    items: [
      { id: 'account', label: 'Minha Conta', component: AccountSettings },
      { id: 'profile', label: 'Perfil', component: null }, // To be implemented
      { id: 'privacy', label: 'Privacidade e Segurança', component: null }, // To be implemented
    ]
  },
  {
    header: 'APLICATIVO',
    items: [
      { id: 'voice', label: 'Voz e Vídeo', component: VoiceSettings },
      { id: 'appearance', label: 'Aparência', component: null }, // To be implemented
      { id: 'notifications', label: 'Notificações', component: null }, // To be implemented
    ]
  }
];

export default function SettingsModal({ onClose, initialTab = 'account' }: SettingsModalProps) {
  const [activeTabId, setActiveTabId] = useState(initialTab);

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
    <div className="fixed inset-0 bg-[#000000]/80 z-50 flex animate-in fade-in duration-200">
      {/* Sidebar */}
      <div className="w-[30%] min-w-[200px] max-w-[280px] bg-[#2B2D31] flex justify-end">
        <div className="w-full max-w-[240px] px-2 py-14 flex flex-col space-y-4">
          {SETTINGS_SECTIONS.map((section, idx) => (
            <div key={idx} className="flex flex-col space-y-1">
              <h3 className="px-3 text-xs font-bold text-[#949BA4] mb-1">{section.header}</h3>
              {section.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTabId(item.id)}
                  className={`text-left px-3 py-1.5 mx-1 rounded-md text-[15px] font-medium transition-colors ${
                    activeTabId === item.id 
                      ? 'bg-[#404249] text-white' 
                      : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {idx < SETTINGS_SECTIONS.length - 1 && <div className="h-px bg-[#3F4147] mx-3 my-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-[#313338] relative flex justify-start">
        <div className="w-full max-w-[740px] py-14 px-10 h-full overflow-y-auto">
          {ActiveComponent ? <ActiveComponent /> : (
            <div className="text-[#949BA4] mt-10">
              <h2 className="text-xl font-bold text-white mb-4">Em Construção</h2>
              <p>Esta seção será implementada em breve.</p>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="absolute top-14 right-14 flex flex-col items-center">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border-2 border-[#949BA4] text-[#949BA4] hover:bg-[#3F4147] transition-colors flex items-center justify-center mb-2"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
          <span className="text-[13px] font-bold text-[#949BA4]">ESC</span>
        </div>
      </div>
    </div>
  );
}
