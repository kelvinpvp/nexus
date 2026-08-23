import { useAppStore } from '@/store/appStore';
import { useVoiceStore } from '@/store/voiceStore';
import VoiceRoom from './VoiceRoom';

export default function ServerVoiceManager() {
  const { servers, activeServerId, activeChannelId } = useAppStore();
  const { connectedVoiceChannelId } = useVoiceStore();

  if (!activeServerId) return null;

  const server = servers.find(s => s.id === activeServerId);
  if (!server) return null;

  const allChannels = server.categories.flatMap(c => c.channels);
  const activeChannel = allChannels.find(c => c.id === activeChannelId);
  const connectedChannel = allChannels.find(c => c.id === connectedVoiceChannelId);

  const isActiveVoice = activeChannel?.type === 'VOICE' || activeChannel?.type === 'STAGE';
  
  // Render if we have a connection OR if the user is trying to view a voice channel
  if (!connectedChannel && !isActiveVoice) return null;

  const channelToRender = connectedChannel || activeChannel;
  if (!channelToRender) return null;

  const isVisible = isActiveVoice;

  return (
    <div className={`${isVisible ? 'flex-1 flex min-w-0 h-full' : 'hidden'}`}>
      <VoiceRoom channelName={channelToRender.name} />
    </div>
  );
}
