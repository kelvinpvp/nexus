import { UserInfo } from '@/store/dmStore';
import { Crown } from 'lucide-react';

interface GroupMemberListProps {
  participants: UserInfo[];
  ownerId?: string | null;
  onUserClick?: (e: React.MouseEvent, userId: string) => void;
}

export default function GroupMemberList({ participants, ownerId, onUserClick }: GroupMemberListProps) {
  // Sort participants to put owner first, then online, then offline
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.id === ownerId) return -1;
    if (b.id === ownerId) return 1;
    if (a.status === 'ONLINE' && b.status !== 'ONLINE') return -1;
    if (b.status === 'ONLINE' && a.status !== 'ONLINE') return 1;
    return a.username.localeCompare(b.username);
  });

  return (
    <div className="w-60 bg-[#2B2D31] flex-shrink-0 flex flex-col h-full overflow-y-auto custom-scrollbar border-l border-[#1E1F22]">
      <div className="p-4 pt-6 pb-2 text-xs font-bold text-[#949BA4] uppercase tracking-wider">
        Membros — {participants.length}
      </div>
      <div className="px-2 space-y-[2px]">
        {sortedParticipants.map((participant) => (
          <div
            key={participant.id}
            onClick={(e) => onUserClick?.(e, participant.id)}
            className="flex items-center space-x-3 p-2 rounded hover:bg-[#35373C] cursor-pointer group transition-colors"
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold overflow-hidden">
                {participant.avatarUrl ? (
                  <img src={participant.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  participant.username.charAt(0).toUpperCase()
                )}
              </div>
              <div
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] border-[#2B2D31] group-hover:border-[#35373C] transition-colors ${
                  participant.status === 'ONLINE'
                    ? 'bg-[#23A559]'
                    : participant.status === 'IDLE'
                    ? 'bg-[#F0B232]'
                    : participant.status === 'DND'
                    ? 'bg-[#F23F43]'
                    : 'bg-[#80848E]'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0 flex items-center">
              <span
                className={`truncate text-[15px] ${
                  participant.status === 'OFFLINE' ? 'text-[#80848E]' : 'text-[#DBDEE1]'
                }`}
              >
                {participant.displayName || participant.username}
              </span>
              {participant.id === ownerId && (
                <Crown size={14} className="ml-1.5 text-[#F0B232] shrink-0" title="Dono do Grupo" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
