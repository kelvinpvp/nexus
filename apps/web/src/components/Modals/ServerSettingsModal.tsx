import React, { useState, useEffect } from 'react';
import { X, Shield, Users, Ban, FileText, Settings, Trash2, Plus, Check } from 'lucide-react';
import { useAppStore, Role, ServerMember } from '@/store/appStore';
import { apiFetch } from '@/lib/api';

interface ServerSettingsModalProps {
  onClose: () => void;
}

const PERMISSIONS = {
  ADMINISTRATOR: 1n << 3n,
  MANAGE_SERVER: 1n << 5n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_CHANNELS: 1n << 4n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
};

const PERM_LABELS = [
  { key: 'ADMINISTRATOR', label: 'Administrador (Todas as permissões)' },
  { key: 'VIEW_CHANNEL', label: 'Ver Canais' },
  { key: 'MANAGE_CHANNELS', label: 'Gerenciar Canais' },
  { key: 'MANAGE_ROLES', label: 'Gerenciar Cargos' },
  { key: 'MANAGE_SERVER', label: 'Gerenciar Servidor' },
  { key: 'KICK_MEMBERS', label: 'Expulsar Membros' },
  { key: 'BAN_MEMBERS', label: 'Banir Membros' },
  { key: 'SEND_MESSAGES', label: 'Enviar Mensagens' },
  { key: 'CONNECT', label: 'Conectar (Voz)' },
  { key: 'SPEAK', label: 'Falar (Voz)' },
  { key: 'MUTE_MEMBERS', label: 'Silenciar Membros (Voz)' },
  { key: 'DEAFEN_MEMBERS', label: 'Ensurdecer Membros (Voz)' },
  { key: 'MOVE_MEMBERS', label: 'Mover Membros (Voz)' },
];

export default function ServerSettingsModal({ onClose }: ServerSettingsModalProps) {
  const { servers, activeServerId, fetchServerDetails } = useAppStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'members' | 'bans' | 'audit'>('overview');

  const server = servers.find(s => s.id === activeServerId);

  // Form states
  const [serverName, setServerName] = useState(server?.name || '');
  const [roles, setRoles] = useState<Role[]>(server?.roles || []);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Role edit form
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#99AAB5');
  const [rolePerms, setRolePerms] = useState<bigint>(0n);

  // Audit Logs & Bans
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (server) {
      setServerName(server.name);
      setRoles(server.roles || []);
    }
  }, [server]);

  useEffect(() => {
    if (activeTab === 'audit' && activeServerId) {
      setIsLoadingLogs(true);
      apiFetch(`/api/servers/${activeServerId}/audit-logs`)
        .then(data => {
          setAuditLogs(data);
          setIsLoadingLogs(false);
        })
        .catch(err => {
          console.error(err);
          setIsLoadingLogs(false);
        });
    }
  }, [activeTab, activeServerId]);

  if (!server) return null;

  const handleCreateRole = async () => {
    try {
      const newRole = await apiFetch(`/api/servers/${server.id}/roles`, {
        method: 'POST',
        body: JSON.stringify({ name: 'Novo Cargo', color: '#99AAB5' })
      });
      setRoles(prev => [...prev, newRole]);
      setSelectedRole(newRole);
      setRoleName(newRole.name);
      setRoleColor(newRole.color);
      setRolePerms(BigInt(newRole.permissions || '0'));
      if (activeServerId) fetchServerDetails(activeServerId);
    } catch (err: any) {
      alert(err.message || 'Erro ao criar cargo');
    }
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;
    try {
      const updated = await apiFetch(`/api/servers/${server.id}/roles/${selectedRole.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: roleName,
          color: roleColor,
          permissions: rolePerms.toString()
        })
      });
      setRoles(prev => prev.map(r => r.id === updated.id ? updated : r));
      setSelectedRole(updated);
      alert('Cargo atualizado com sucesso!');
      if (activeServerId) fetchServerDetails(activeServerId);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar cargo');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cargo?')) return;
    try {
      await apiFetch(`/api/servers/${server.id}/roles/${roleId}`, { method: 'DELETE' });
      setRoles(prev => prev.filter(r => r.id !== roleId));
      if (selectedRole?.id === roleId) setSelectedRole(null);
      if (activeServerId) fetchServerDetails(activeServerId);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir cargo');
    }
  };

  const handleTogglePerm = (permValue: bigint) => {
    if ((rolePerms & permValue) === permValue) {
      setRolePerms(rolePerms & ~permValue); // Remove
    } else {
      setRolePerms(rolePerms | permValue); // Add
    }
  };

  const handleAssignRole = async (memberId: string, roleId: string) => {
    try {
      const member = server.members.find(m => m.id === memberId);
      if (!member) return;
      const currentRoleIds = member.roles?.map(r => r.roleId) || [];
      const isAdding = !currentRoleIds.includes(roleId);
      
      let newRoleIds = [...currentRoleIds];
      if (isAdding) newRoleIds.push(roleId);
      else newRoleIds = newRoleIds.filter(id => id !== roleId);

      await apiFetch(`/api/servers/${server.id}/members/${memberId}/roles`, {
        method: 'POST',
        body: JSON.stringify({ roleIds: newRoleIds })
      });
      if (activeServerId) fetchServerDetails(activeServerId);
    } catch (err: any) {
      alert(err.message || 'Erro ao modificar cargos do membro');
    }
  };

  const handleKickMember = async (memberId: string, username: string) => {
    if (!confirm(`Expulsar ${username} do servidor?`)) return;
    try {
      await apiFetch(`/api/servers/${server.id}/members/${memberId}/kick`, { method: 'POST' });
      alert(`${username} foi expulsodo servidor.`);
      if (activeServerId) fetchServerDetails(activeServerId);
    } catch (err: any) {
      alert(err.message || 'Erro ao expulsar membro');
    }
  };

  const handleBanMember = async (memberId: string, username: string) => {
    if (!confirm(`Banir permanentemente ${username} do servidor?`)) return;
    try {
      await apiFetch(`/api/servers/${server.id}/members/${memberId}/ban`, { method: 'POST' });
      alert(`${username} foi banido.`);
      if (activeServerId) fetchServerDetails(activeServerId);
    } catch (err: any) {
      alert(err.message || 'Erro ao banir membro');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#000000]/80 z-50 flex animate-in fade-in duration-200">
      {/* Sidebar */}
      <div className="w-[30%] min-w-[200px] max-w-[280px] bg-[#2B2D31] flex justify-end">
        <div className="w-full max-w-[240px] px-2 py-14 flex flex-col space-y-2">
          <h3 className="px-3 text-xs font-bold text-[#949BA4] mb-2 uppercase">{server.name}</h3>
          
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 text-left px-3 py-1.5 rounded-md text-[15px] font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-[#404249] text-white' : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-white'
            }`}
          >
            <Settings size={18} />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center space-x-2 text-left px-3 py-1.5 rounded-md text-[15px] font-medium transition-colors ${
              activeTab === 'roles' ? 'bg-[#404249] text-white' : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-white'
            }`}
          >
            <Shield size={18} />
            <span>Cargos</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center space-x-2 text-left px-3 py-1.5 rounded-md text-[15px] font-medium transition-colors ${
              activeTab === 'members' ? 'bg-[#404249] text-white' : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-white'
            }`}
          >
            <Users size={18} />
            <span>Membros</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 text-left px-3 py-1.5 rounded-md text-[15px] font-medium transition-colors ${
              activeTab === 'audit' ? 'bg-[#404249] text-white' : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-white'
            }`}
          >
            <FileText size={18} />
            <span>Registro de Auditoria</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#313338] relative flex justify-start">
        <div className="w-full max-w-[740px] py-14 px-10 h-full overflow-y-auto custom-scrollbar text-white">
          
          {/* TAB: VISÃO GERAL */}
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Visão Geral do Servidor</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#949BA4] mb-2">Nome do Servidor</label>
                  <input
                    type="text"
                    value={serverName}
                    onChange={e => setServerName(e.target.value)}
                    className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded p-2.5 text-sm text-white outline-none focus:border-[#5865F2]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: CARGOS */}
          {activeTab === 'roles' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Gerenciamento de Cargos</h2>
                <button
                  onClick={handleCreateRole}
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-3 py-1.5 rounded text-sm font-medium flex items-center space-x-1 transition-colors"
                >
                  <Plus size={16} />
                  <span>Criar Cargo</span>
                </button>
              </div>

              <div className="flex space-x-6">
                {/* Role List */}
                <div className="w-48 bg-[#2B2D31] p-2 rounded-lg space-y-1 shrink-0 h-fit">
                  {roles.map(r => (
                    <div
                      key={r.id}
                      onClick={() => {
                        setSelectedRole(r);
                        setRoleName(r.name);
                        setRoleColor(r.color);
                        setRolePerms(BigInt(r.permissions || '0'));
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                        selectedRole?.id === r.id ? 'bg-[#404249] text-white' : 'text-[#B5BAC1] hover:bg-[#35373C]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                        <span className="text-sm font-medium truncate">{r.name}</span>
                      </div>
                      {!r.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(r.id);
                          }}
                          className="text-[#949BA4] hover:text-[#F23F43] transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Role Editor */}
                {selectedRole ? (
                  <div className="flex-1 space-y-6 bg-[#2B2D31] p-4 rounded-lg">
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#949BA4] mb-2">Nome do Cargo</label>
                      <input
                        type="text"
                        disabled={selectedRole.isDefault}
                        value={roleName}
                        onChange={e => setRoleName(e.target.value)}
                        className="w-full bg-[#1E1F22] rounded p-2 text-sm text-white outline-none focus:border-[#5865F2]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-[#949BA4] mb-2">Cor do Cargo</label>
                      <input
                        type="color"
                        value={roleColor}
                        onChange={e => setRoleColor(e.target.value)}
                        className="w-12 h-10 bg-transparent cursor-pointer border-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-[#949BA4] mb-4">Permissões</label>
                      <div className="space-y-3">
                        {PERM_LABELS.map(perm => {
                          const permValue = PERMISSIONS[perm.key as keyof typeof PERMISSIONS];
                          const hasPerm = (rolePerms & permValue) === permValue;
                          return (
                            <div key={perm.key} className="flex items-center justify-between bg-[#1E1F22] p-3 rounded">
                              <span className="text-sm font-medium">{perm.label}</span>
                              <button
                                onClick={() => handleTogglePerm(permValue)}
                                className={`w-10 h-6 rounded-full relative transition-colors ${hasPerm ? 'bg-[#23A559]' : 'bg-[#80848E]'}`}
                              >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${hasPerm ? 'translate-x-5' : 'translate-x-1'}`} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#3F4147] flex justify-end">
                      <button
                        onClick={handleSaveRole}
                        className="bg-[#23A559] hover:bg-[#1A7C43] text-white px-4 py-2 rounded font-semibold text-sm transition-colors"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[#949BA4]">
                    Selecione um cargo para editar
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: MEMBROS */}
          {activeTab === 'members' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Membros do Servidor ({server.members.length})</h2>
              <div className="space-y-2">
                {server.members.map(m => {
                  const memberRoleIds = m.roles?.map(r => r.roleId) || [];
                  return (
                    <div key={m.id} className="flex items-center justify-between bg-[#2B2D31] p-3 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold shrink-0">
                          {m.user.avatarUrl ? <img src={m.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/> : m.user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{m.user.username}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {roles.filter(r => memberRoleIds.includes(r.id)).map(r => (
                              <div key={r.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-[#3F4147] flex items-center space-x-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                                <span>{r.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {m.user.id !== server.ownerId && (
                        <div className="flex items-center space-x-4">
                          {/* Role Dropdown */}
                          <div className="relative group">
                            <button className="text-xs font-semibold text-[#B5BAC1] hover:text-white transition-colors flex items-center space-x-1">
                              <Plus size={14} />
                              <span>Cargos</span>
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-48 bg-[#111214] border border-[#1F2023] rounded-lg shadow-2xl p-1.5 space-y-0.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                              <div className="text-[10px] font-bold text-[#949BA4] uppercase px-2 mb-1">Cargos do Servidor</div>
                              {roles.filter(r => !r.isDefault).map(r => {
                                const hasRole = memberRoleIds.includes(r.id);
                                return (
                                  <button
                                    key={r.id}
                                    onClick={() => handleAssignRole(m.id, r.id)}
                                    className="w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-[#DBDEE1] hover:bg-[#35373C] transition-colors"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                                      <span>{r.name}</span>
                                    </div>
                                    {hasRole && <Check size={14} className="text-[#23A559]" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="h-4 w-px bg-[#3F4147]" />

                          <button
                            onClick={() => handleKickMember(m.id, m.user.username)}
                            className="text-[#F23F43] hover:text-[#F23F43] text-xs font-semibold transition-colors"
                          >
                            Expulsar
                          </button>
                          <button
                            onClick={() => handleBanMember(m.id, m.user.username)}
                            className="bg-[#F23F43] hover:bg-[#DA373C] text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors"
                          >
                            Banir
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: AUDIT LOG */}
          {activeTab === 'audit' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Registro de Auditoria</h2>
              {isLoadingLogs ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865F2] mx-auto" />
              ) : auditLogs.length === 0 ? (
                <div className="text-[#949BA4]">Nenhuma ação registrada ainda.</div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="bg-[#2B2D31] p-3 rounded-lg flex items-start justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">
                          <span className="text-[#5865F2]">{log.actor.username}</span> executou <span className="text-[#FEE75C]">{log.action}</span>
                        </div>
                        {log.reason && <div className="text-xs text-[#949BA4] mt-1">Motivo: {log.reason}</div>}
                      </div>
                      <div className="text-xs text-[#949BA4]">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
