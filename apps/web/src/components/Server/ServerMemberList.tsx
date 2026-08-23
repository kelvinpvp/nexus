import React, { useState } from 'react';
import { useAppStore, ServerMember } from '@/store/appStore';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, ShieldCheck, User } from 'lucide-react';
import ProfilePopout from '../Profile/ProfilePopout';

interface ServerMemberListProps {
  members: ServerMember[];
}

export default function ServerMemberList({ members }: ServerMemberListProps) {
  const { user } = useAuth();
  const [selectedUserPopout, setSelectedUserPopout] = useState<{ userId: string; top: number; left: number } | null>(null);

  const handleUserClick = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setSelectedUserPopout({
      userId,
      top: rect.bottom + 5,
      left: Math.min(rect.left, window.innerWidth - 320),
    });
  };

  // Group members by Role / Ownership
  const owners = members.filter(m => m.role === 'OWNER');
  const admins = members.filter(m => m.role === 'ADMIN');
  const regularMembers = members.filter(m => m.role !== 'OWNER' && m.role !== 'ADMIN');

  const renderMemberItem = (m: ServerMember) => {
    const isOnline = m.user.status === 'ONLINE' || m.user.status === 'idle' || m.user.status === 'dnd';
    const isOwner = m.role === 'OWNER';
    const isAdmin = m.role === 'ADMIN';

    return (
      <div 
        key={m.id}
        onClick={(e) => handleUserClick(e, m.user.id)}
        className="flex items-center px-2 py-1.5 rounded hover:bg-[#35373C] cursor-pointer group transition-colors"
      >
        <div className="relative w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-sm shrink-0 mr-3">
          {m.user.avatarUrl ? (
            <img src={m.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            m.user.username.charAt(0).toUpperCase()
          )}
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#2B2D31] ${isOnline ? 'bg-[#23A559]' : 'bg-[#80848E]'}`} />
        </div>

        <div className="flex items-center flex-1 min-w-0">
          <span className={`font-medium text-[14px] truncate ${isOwner ? 'text-[#FEE75C]' : isAdmin ? 'text-[#5865F2]' : 'text-[#DBDEE1] group-hover:text-white'}`}>
            {m.user.username}
          </span>
          {isOwner && (
            <Crown size={14} className="text-[#FEE75C] ml-1.5 shrink-0" />
          )}
          {isAdmin && !isOwner && (
            <ShieldCheck size={14} className="text-[#5865F2] ml-1.5 shrink-0" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[240px] bg-[#2B2D31] flex flex-col shrink-0 h-full border-l border-[#1F2023] select-none p-3 overflow-y-auto custom-scrollbar">
      {/* Owners Section */}
      {owners.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-[#949BA4] uppercase tracking-wider px-2 mb-1.5">
            DONO — {owners.length}
          </h3>
          <div className="space-y-0.5">
            {owners.map(renderMemberItem)}
          </div>
        </div>
      )}

      {/* Admins Section */}
      {admins.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-[#949BA4] uppercase tracking-wider px-2 mb-1.5">
            ADMINISTRADORES — {admins.length}
          </h3>
          <div className="space-y-0.5">
            {admins.map(renderMemberItem)}
          </div>
        </div>
      )}

      {/* Regular Members Section */}
      <div className="mb-4">
        <h3 className="text-xs font-bold text-[#949BA4] uppercase tracking-wider px-2 mb-1.5">
          MEMBROS — {regularMembers.length}
        </h3>
        <div className="space-y-0.5">
          {regularMembers.map(renderMemberItem)}
        </div>
      </div>

      {selectedUserPopout && (
        <ProfilePopout
          userId={selectedUserPopout.userId}
          position={{ top: selectedUserPopout.top, left: selectedUserPopout.left }}
          onClose={() => setSelectedUserPopout(null)}
        />
      )}
    </div>
  );
}
