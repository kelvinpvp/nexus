import { useCallStore } from '@/store/callStore';
import { Phone, PhoneOff, Video, X } from 'lucide-react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';

export default function CallManager() {
  const { 
    incomingCall, 
    activeCall, 
    isCallModalOpen, 
    liveKitToken, 
    roomName,
    acceptCall, 
    declineCall, 
    endCall,
    setCallModalOpen
  } = useCallStore();

  return (
    <>
      {/* Incoming Call Toast / Modal */}
      {incomingCall && !activeCall && (
        <div className="fixed top-4 right-4 z-50 bg-[#1E1F22] border border-[#313338] shadow-xl rounded-lg p-4 w-80 animate-in slide-in-from-right-10">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-2xl mb-3 shadow-lg">
              {incomingCall.initiator?.avatarUrl ? (
                <img src={incomingCall.initiator.avatarUrl} alt="Avatar" className="w-full h-full rounded-full" />
              ) : (
                incomingCall.initiator?.username.charAt(0).toUpperCase()
              )}
            </div>
            <h3 className="text-white font-bold text-lg mb-1">{incomingCall.initiator?.displayName || incomingCall.initiator?.username}</h3>
            <p className="text-[#949BA4] text-sm mb-4">
              Incoming {incomingCall.type === 'VIDEO' ? 'Video' : 'Voice'} Call
            </p>
            <div className="flex justify-center space-x-4 w-full">
              <button 
                onClick={() => declineCall(incomingCall.id)}
                className="flex-1 bg-[#DA373C] hover:bg-[#A12828] text-white py-2 rounded transition-colors flex items-center justify-center font-medium"
              >
                <PhoneOff size={20} className="mr-2" /> Decline
              </button>
              <button 
                onClick={() => acceptCall(incomingCall.id)}
                className="flex-1 bg-[#23A559] hover:bg-[#1A7C43] text-white py-2 rounded transition-colors flex items-center justify-center font-medium"
              >
                {incomingCall.type === 'VIDEO' ? <Video size={20} className="mr-2" /> : <Phone size={20} className="mr-2" />} 
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Modal */}
      {isCallModalOpen && activeCall && liveKitToken && roomName && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1E1F22] w-full max-w-5xl h-[80vh] rounded-xl flex flex-col overflow-hidden shadow-2xl border border-[#313338]">
            <div className="h-14 bg-[#2B2D31] flex items-center justify-between px-4 border-b border-[#1E1F22] shrink-0">
              <div className="flex items-center text-white font-medium">
                {activeCall.type === 'VIDEO' ? <Video size={18} className="mr-2 text-[#949BA4]" /> : <Phone size={18} className="mr-2 text-[#949BA4]" />}
                Call with {activeCall.initiator?.displayName || activeCall.initiator?.username || 'User'}
              </div>
              <div className="flex items-center">
                <button 
                  onClick={() => setCallModalOpen(false)}
                  className="text-[#949BA4] hover:text-[#DBDEE1] transition-colors p-1 mr-2"
                  title="Minimize to background"
                >
                  <X size={20} />
                </button>
                <button 
                  onClick={() => endCall(activeCall.id)}
                  className="bg-[#DA373C] hover:bg-[#A12828] text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  End Call
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 bg-[#000000] relative">
              <LiveKitRoom
                video={activeCall.type === 'VIDEO'}
                audio={true}
                token={liveKitToken}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                data-lk-theme="default"
                style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
                onDisconnected={() => {
                  endCall(activeCall.id);
                }}
              >
                <VideoConference />
                <RoomAudioRenderer />
              </LiveKitRoom>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
