import { useAppStore } from '@/store/appStore';
import { useVoiceStore } from '@/store/voiceStore';
import VoiceRoom from './VoiceRoom';

export default function ServerVoiceManager() {
  const { servers, activeServerId, activeChannelId } = useAppStore();
  const { connectedVoiceChannelId, connectedServerId } = useVoiceStore();

  // Find the channel we are actually connected to
  let connectedChannel = null;
  if (connectedServerId && connectedVoiceChannelId) {
    const connectedServer = servers.find(s => s.id === connectedServerId);
    const allChannels = connectedServer?.categories?.flatMap(c => c.channels) || [];
    connectedChannel = allChannels.find(c => c.id === connectedVoiceChannelId);
  }

  // Find the channel the user is currently viewing (if any)
  let activeChannel = null;
  if (activeServerId && activeChannelId) {
    const activeServer = servers.find(s => s.id === activeServerId);
    const allChannels = activeServer?.categories?.flatMap(c => c.channels) || [];
    activeChannel = allChannels.find(c => c.id === activeChannelId);
  }

  const isViewingVoiceChannel = activeChannel?.type === 'VOICE' || activeChannel?.type === 'STAGE';
  
  // Render if we have an active connection OR if the user is viewing a voice channel (connecting state)
  if (!connectedChannel && !isViewingVoiceChannel) return null;

  // The channel to render is the connected one, unless we are connecting to a new one
  const channelToRender = connectedChannel || activeChannel;
  if (!channelToRender) return null;

  // Only show the UI if the user is looking at the exact server and channel they are connected/connecting to
  const isVisible = isViewingVoiceChannel && 
    (activeServerId === connectedServerId || !connectedServerId) &&
    (activeChannelId === connectedVoiceChannelId || !connectedVoiceChannelId);

  return (
    <div className={`${isVisible ? 'flex-1 flex min-w-0 h-full' : 'hidden'}`}>
      <VoiceRoom channelName={channelToRender.name} />
    </div>
  );
}
