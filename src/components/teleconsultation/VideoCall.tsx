import { useEffect, useState, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack, IRemoteUser } from 'agora-rtc-sdk-ng';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

interface VideoCallProps {
    appId: string;
    channelName: string;
    token: string | null;
    uid?: number | string;
    duration?: number;
    onCallEnd: () => void;
}

export function VideoCall({ appId, channelName, token, uid, duration, onCallEnd }: VideoCallProps) {
    const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
    const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<IRemoteUser[]>([]);
    const [client, setClient] = useState<IAgoraRTCClient | null>(null);
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const [isJoining, setIsJoining] = useState(true);

    const localPlayerRef = useRef<HTMLDivElement>(null);

    // Play local video track when available
    useEffect(() => {
        if (localVideoTrack && localPlayerRef.current && cameraOn) {
            localVideoTrack.play(localPlayerRef.current);
        } else if (localVideoTrack) {
            localVideoTrack.stop();
        }
    }, [localVideoTrack, cameraOn]);

    useEffect(() => {
        if (!token) return;
        let agoraClient: IAgoraRTCClient;

        const setupAgora = async () => {
            try {
                agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
                setClient(agoraClient);

                agoraClient.on("user-published", async (user: IRemoteUser, mediaType: 'video' | 'audio') => {
                    await agoraClient.subscribe(user, mediaType);
                    if (mediaType === 'video') {
                        setRemoteUsers(prev => {
                            if (prev.find(u => u.uid === user.uid)) return prev;
                            return [...prev, user];
                        });
                    }
                    if (mediaType === 'audio') {
                        user.audioTrack?.play();
                    }
                });

                agoraClient.on("user-unpublished", (user: IRemoteUser) => {
                    setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
                });

                await agoraClient.join(appId, channelName, token, uid || null);

                // Setup audio
                try {
                    const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                    setLocalAudioTrack(audioTrack);
                    await agoraClient.publish(audioTrack);
                } catch (e) {
                    console.warn("Mic error:", e);
                }

                // Setup video
                try {
                    const videoTrack = await AgoraRTC.createCameraVideoTrack();
                    setLocalVideoTrack(videoTrack);
                    await agoraClient.publish(videoTrack);
                } catch (e) {
                    console.warn("Camera error:", e);
                }

                setIsJoining(false);
            } catch (error) {
                console.error("Agora Setup Error:", error);
                toast.error("Erreur de connexion vidéo");
                onCallEnd();
            }
        };

        setupAgora();

        return () => {
            if (agoraClient) {
                agoraClient.leave();
                agoraClient.removeAllListeners();
            }
        };
    }, [appId, channelName, token, uid]);

    const leaveCall = async () => {
        if (localAudioTrack) {
            localAudioTrack.stop();
            localAudioTrack.close();
        }
        if (localVideoTrack) {
            localVideoTrack.stop();
            localVideoTrack.close();
        }
        if (client) {
            await client.leave();
        }
        setRemoteUsers([]);
        onCallEnd();
    };

    const toggleMic = async () => {
        if (localAudioTrack) {
            await localAudioTrack.setEnabled(!micOn);
            setMicOn(!micOn);
        }
    };

    const toggleCamera = async () => {
        if (localVideoTrack) {
            await localVideoTrack.setEnabled(!cameraOn);
            setCameraOn(!cameraOn);
        }
    };

    if (isJoining) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] bg-slate-50">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Connexion à la salle de consultation...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] gap-4 p-4 bg-slate-100 overflow-hidden">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Local Video */}
                <Card className="relative overflow-hidden bg-black flex items-center justify-center border-2 border-primary/20 shadow-lg">
                    <div ref={localPlayerRef} className="w-full h-full object-cover mirror-view" />
                    <div className="absolute top-4 left-4 flex gap-2">
                        <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-sm border-none">
                            Vous
                        </Badge>
                        {!cameraOn && <Badge variant="destructive">Caméra éteinte</Badge>}
                        {!micOn && <Badge variant="destructive">Micro coupé</Badge>}
                    </div>
                </Card>

                {/* Remote Videos */}
                <div className="flex flex-col gap-4">
                    {remoteUsers.length > 0 ? (
                        remoteUsers.map(user => (
                            <Card key={user.uid} className="relative flex-1 overflow-hidden bg-black flex items-center justify-center border-2 border-primary/20 shadow-lg">
                                <RemotePlayer user={user} />
                                <div className="absolute top-4 left-4">
                                    <Badge variant="secondary" className="bg-primary/80 text-white backdrop-blur-sm border-none">
                                        Correspondant
                                    </Badge>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <Card className="flex-1 flex flex-col items-center justify-center bg-slate-200 border-2 border-dashed border-slate-300">
                            <Users className="h-16 w-16 text-slate-400 mb-4 opacity-30" />
                            <p className="text-slate-500 font-medium font-inter">En attente de l'autre participant...</p>
                            <div className="flex gap-1 mt-4">
                                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Control Bar */}
            <div className="bg-white/90 backdrop-blur-md border rounded-full p-4 flex items-center justify-center gap-6 shadow-xl mx-auto mb-4 w-fit px-8 border-slate-200">
                <Button
                    variant={micOn ? "outline" : "destructive"}
                    size="icon"
                    className="rounded-full h-12 w-12 hover:scale-110 transition-transform"
                    onClick={toggleMic}
                >
                    {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                </Button>
                <Button
                    variant={cameraOn ? "outline" : "destructive"}
                    size="icon"
                    className="rounded-full h-12 w-12 hover:scale-110 transition-transform"
                    onClick={toggleCamera}
                >
                    {cameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                </Button>
                <div className="h-8 w-px bg-slate-300 mx-2" />
                <Button
                    variant="destructive"
                    size="icon"
                    className="rounded-full h-14 w-14 hover:scale-110 transition-transform animate-pulse hover:animate-none"
                    onClick={() => leaveCall()}
                >
                    <PhoneOff className="h-7 w-7" />
                </Button>
            </div>

            <style>{`
        .mirror-view video {
          transform: scaleX(-1);
        }
        .agora_video_player {
          object-fit: cover !important;
        }
        div[id^="local-player"] > div, 
        div[class*="remote-player"] > div {
          background-color: black !important;
        }
      `}</style>
        </div>
    );
}

function RemotePlayer({ user }: { user: IRemoteUser }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current && user.videoTrack) {
            user.videoTrack.play(ref.current);
        }
    }, [user.videoTrack]);

    return <div ref={ref} className="w-full h-full object-cover" />;
}
