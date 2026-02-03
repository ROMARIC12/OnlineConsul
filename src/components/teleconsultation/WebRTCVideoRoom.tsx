import { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Loader2, Users, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WebRTCVideoRoomProps {
    channelName: string;
    onEndCall: () => void;
    isInitiator?: boolean;
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19301' },
        { urls: 'stun:stun1.l.google.com:19301' },
        { urls: 'stun:stun2.l.google.com:19301' },
    ],
};

export function WebRTCVideoRoom({ channelName, onEndCall, isInitiator = false }: WebRTCVideoRoomProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const [isStarted, setIsStarted] = useState(false);
    const [connectionState, setConnectionState] = useState<'idle' | 'joining' | 'connected' | 'error'>('idle');

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const channelRef = useRef<any>(null);

    const cleanup = () => {
        console.log("[WebRTC] Cleaning up...");
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (pcRef.current) {
            pcRef.current.close();
        }
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }
    };

    const handleJoin = async () => {
        setConnectionState('joining');
        try {
            // 1. Get Media
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // 2. Setup RTCPeerConnection
            const pc = new RTCPeerConnection(ICE_SERVERS);
            pcRef.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.ontrack = (event) => {
                console.log("[WebRTC] Received remote track");
                setRemoteStream(event.streams[0]);
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log("[WebRTC] Sending ICE candidate");
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'ice-candidate',
                        payload: { candidate: event.candidate }
                    });
                }
            };

            pc.onconnectionstatechange = () => {
                console.log("[WebRTC] Connection state:", pc.connectionState);
                if (pc.connectionState === 'connected') {
                    setConnectionState('connected');
                } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                    setConnectionState('error');
                }
            };

            // 3. Setup Signaling Channel
            const channel = supabase.channel(`webrtc-${channelName}`);
            channelRef.current = channel;

            channel
                .on('broadcast', { event: 'offer' }, async ({ payload }) => {
                    if (isInitiator) return; // Initiator only sends offers
                    console.log("[WebRTC] Received offer");
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    channel.send({
                        type: 'broadcast',
                        event: 'answer',
                        payload: { sdp: answer }
                    });
                })
                .on('broadcast', { event: 'answer' }, async ({ payload }) => {
                    if (!isInitiator) return; // Only initiator receives answers
                    console.log("[WebRTC] Received answer");
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                })
                .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
                    console.log("[WebRTC] Received ICE candidate");
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                    } catch (e) {
                        console.error("[WebRTC] Error adding received ice candidate", e);
                    }
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log("[WebRTC] Signaling channel ready");
                        if (isInitiator) {
                            console.log("[WebRTC] Creating offer...");
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            channel.send({
                                type: 'broadcast',
                                event: 'offer',
                                payload: { sdp: offer }
                            });
                        }
                    }
                });

            setIsStarted(true);
        } catch (error) {
            console.error("[WebRTC] Failed to start:", error);
            setConnectionState('error');
            toast.error("Impossible d'accéder à la caméra ou au micro");
        }
    };

    useEffect(() => {
        return cleanup;
    }, []);

    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !micOn;
            });
            setMicOn(!micOn);
        }
    };

    const toggleCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !cameraOn;
            });
            setCameraOn(!cameraOn);
        }
    };

    if (!isStarted) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] p-4 bg-slate-50">
                <Card className="p-8 max-w-md w-full text-center space-y-6 shadow-xl border-t-4 border-t-amber-500">
                    <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                        <Video className="h-10 w-10 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Mode Secours WebRTC</h2>
                        <Badge variant="outline" className="mb-2 text-amber-600 border-amber-200 bg-amber-50">
                            Alternative à Agora
                        </Badge>
                        <p className="text-muted-foreground mt-2">
                            La connexion directe est prête. Cliquez pour rejoindre la consultation en mode sécurisé P2P.
                        </p>
                    </div>

                    <Button
                        size="lg"
                        className="w-full h-14 text-lg font-bold gap-2 bg-amber-600 hover:bg-amber-700"
                        onClick={handleJoin}
                        disabled={connectionState === 'joining'}
                    >
                        {connectionState === 'joining' ? (
                            <><Loader2 className="h-5 w-5 animate-spin" /> Initialisation...</>
                        ) : (
                            <><Video className="h-5 w-5" /> Rejoindre via WebRTC</>
                        )}
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] gap-4 p-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Local Video */}
                <Card className="relative overflow-hidden bg-black/90 flex items-center justify-center border-2 border-primary/20">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover mirror"
                        style={{ transform: 'scaleX(-1)' }}
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                        <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-sm border-none">
                            Vous (WebRTC)
                        </Badge>
                        {!cameraOn && <Badge variant="destructive">Caméra éteinte</Badge>}
                        {!micOn && <Badge variant="destructive">Micro coupé</Badge>}
                    </div>
                </Card>

                {/* Remote Video */}
                <Card className="relative overflow-hidden bg-black/90 flex items-center justify-center border-2 border-primary/20">
                    {remoteStream ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-center p-6 bg-slate-100 h-full w-full flex flex-col items-center justify-center">
                            <Users className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                            <p className="text-muted-foreground font-medium text-lg">
                                {isInitiator ? "En attente du médecin..." : "En attente du patient..."}
                            </p>
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mt-4" />
                        </div>
                    )}
                    {remoteStream && (
                        <span className="absolute top-4 left-4">
                            <Badge variant="secondary" className="bg-primary/80 text-white backdrop-blur-sm border-none">
                                Correspondant
                            </Badge>
                        </span>
                    )}
                </Card>
            </div>

            {/* Controls */}
            <div className="bg-background/80 backdrop-blur-md border rounded-full p-4 flex items-center justify-center gap-6 shadow-2xl mx-auto mb-4 border-primary/10">
                <Button
                    variant={micOn ? "outline" : "destructive"}
                    size="icon"
                    className="rounded-full h-14 w-14"
                    onClick={toggleMic}
                >
                    {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                </Button>
                <Button
                    variant={cameraOn ? "outline" : "destructive"}
                    size="icon"
                    className="rounded-full h-14 w-14"
                    onClick={toggleCamera}
                >
                    {cameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                </Button>
                <div className="h-10 w-px bg-border mx-2" />
                <Button
                    variant="destructive"
                    size="icon"
                    className="rounded-full h-14 w-14"
                    onClick={onEndCall}
                >
                    <PhoneOff className="h-6 w-6" />
                </Button>
            </div>

            {connectionState === 'error' && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-bounce">
                    <AlertCircle className="h-4 w-4" />
                    Problème de connexion P2P détecté
                </div>
            )}
        </div>
    );
}
