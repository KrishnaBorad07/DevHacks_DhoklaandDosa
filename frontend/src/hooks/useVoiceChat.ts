// =============================================================================
// hooks/useVoiceChat.ts – WebRTC voice chat with phase-based channel switching
// =============================================================================
// Architecture:
//   - Two audio channels: 'general' (everyone) and 'mafia' (mafias @ night)
//   - Socket.io backend relays WebRTC offers/answers/ICE (pure signaling)
//   - Audio travels peer-to-peer via WebRTC (STUN + TURN for LAN + internet)
//   - Phase transitions auto-switch channels and mute/unmute the local mic
// =============================================================================
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

// STUN = free LAN peer-to-peer
// TURN = relayed fallback for internet / NAT traversal (Open Relay Project — free, no key needed)
const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // OpenRelay free public TURN — works for internet play
    {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
    {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
    {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
];

type AudioChannel = 'general' | 'mafia';

export interface VoiceState {
    /** Whether the local mic track is enabled (unmuted) */
    micOn: boolean;
    /** Current audio channel we're in */
    channel: AudioChannel;
    /** IDs of peers currently/recently speaking (updated by analyser) */
    speaking: Set<string>;
    /** Peer socket IDs in current channel */
    peers: string[];
    /** Whether mic access was granted at all */
    hasPermission: boolean;
    /** Toggle mic on/off */
    toggleMic: () => void;
}

/**
 * Determines which channel this player should be in based on game phase/role.
 * Returns null if the player should have no active audio (e.g. night but not mafia).
 */
function resolveChannel(
    phase: string,
    myRole: string | null,
    alive: boolean,
    aliveMafiaCount: number,
): { channel: AudioChannel; micAllowed: boolean } {
    // Eliminated players: listen to general only, mic off
    if (!alive) return { channel: 'general', micAllowed: false };

    switch (phase) {
        case 'lobby':
        case 'day':
        case 'vote':
        case 'ended':
            return { channel: 'general', micAllowed: true };
        case 'night':
            if (myRole === 'mafia' && aliveMafiaCount >= 2) {
                return { channel: 'mafia', micAllowed: true };
            }
            // Non-mafia or solo mafia: muted during night
            return { channel: 'general', micAllowed: false };
        default:
            return { channel: 'general', micAllowed: false };
    }
}

export function useVoiceChat(
    socket: Socket,
    roomCode: string | null,
    phase: string,
    myRole: string | null,
    alive: boolean,
    aliveMafiaCount: number,
): VoiceState {
    // socket is passed in from the caller (same instance used to join the room)

    // Local mic stream
    const localStreamRef = useRef<MediaStream | null>(null);
    // Map: peerId → RTCPeerConnection
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    // Map: peerId → remote <audio> element
    const audioElemsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
    // AudioContext for speaking detection
    const ctxRef = useRef<AudioContext | null>(null);
    // Analyser per peer
    const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());

    const [micOn, setMicOn] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [channel, setChannel] = useState<AudioChannel>('general');
    const [speaking, setSpeaking] = useState<Set<string>>(new Set());
    const [peers, setPeers] = useState<string[]>([]);

    // ── Initialise local mic stream ─────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;
        navigator.mediaDevices
            .getUserMedia({ audio: true, video: false })
            .then((stream) => {
                if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
                localStreamRef.current = stream;
                setHasPermission(true);
                // Start muted — channel resolver will unmute when appropriate
                stream.getAudioTracks().forEach((t) => { t.enabled = false; });
            })
            .catch((err) => {
                console.warn('[VoiceChat] mic permission denied or unavailable:', err);
                setHasPermission(false);
            });
        return () => {
            mounted = false;
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    // ── Create a peer connection for a given peerId ─────────────────────────────
    const createPeer = useCallback((peerId: string, initiator: boolean) => {
        if (peersRef.current.has(peerId)) return;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        // Add local tracks
        const stream = localStreamRef.current;
        if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        // ICE → relay via socket
        pc.onicecandidate = (e) => {
            if (e.candidate && roomCode) {
                socket.emit('rtc:ice', { to: peerId, candidate: e.candidate.toJSON() });
            }
        };

        // Remote track → attach to a hidden <audio> element
        pc.ontrack = (e) => {
            console.log(`[VoiceChat] ontrack from ${peerId}`, e.streams);
            if (!e.streams || e.streams.length === 0) return;

            let audio = audioElemsRef.current.get(peerId);
            if (!audio) {
                audio = document.createElement('audio');
                audio.autoplay = true;
                (audio as any).playsInline = true;
                audio.volume = 1.0;
                audio.setAttribute('data-peer', peerId);
                document.body.appendChild(audio);
                audioElemsRef.current.set(peerId, audio);
            }
            audio.srcObject = e.streams[0];

            // Explicitly call play() — autoplay attribute alone is often blocked by browser policy
            audio.play().catch((err) => {
                console.warn('[VoiceChat] audio.play() blocked:', err);
                // If blocked, retry on next user interaction
                const resume = () => { audio!.play().catch(() => { }); document.removeEventListener('click', resume); };
                document.addEventListener('click', resume, { once: true });
            });

            // Attach speaking analyser
            if (!ctxRef.current) ctxRef.current = new AudioContext();
            const ctx = ctxRef.current;
            // Resume context if suspended (Chrome suspends AudioContext until user gesture)
            if (ctx.state === 'suspended') {
                ctx.resume().then(() => console.log('[VoiceChat] AudioContext resumed'));
            }
            const src = ctx.createMediaStreamSource(e.streams[0]);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            src.connect(analyser);
            analysersRef.current.set(peerId, analyser);
        };

        pc.onconnectionstatechange = () => {
            console.log(`[VoiceChat] Peer ${peerId} state: ${pc.connectionState}`);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                removePeer(peerId);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`[VoiceChat] ICE ${peerId}: ${pc.iceConnectionState}`);
        };

        peersRef.current.set(peerId, pc);
        setPeers([...peersRef.current.keys()]);

        if (initiator) {
            pc.createOffer().then((offer) => {
                pc.setLocalDescription(offer);
                socket.emit('rtc:offer', { to: peerId, offer });
            });
        }
    }, [socket, roomCode]);

    const removePeer = useCallback((peerId: string) => {
        peersRef.current.get(peerId)?.close();
        peersRef.current.delete(peerId);
        analysersRef.current.delete(peerId);
        const audio = audioElemsRef.current.get(peerId);
        if (audio) { audio.srcObject = null; audio.remove(); }
        audioElemsRef.current.delete(peerId);
        setPeers([...peersRef.current.keys()]);
        setSpeaking((prev) => { const next = new Set(prev); next.delete(peerId); return next; });
    }, []);

    // ── Socket signaling listeners ──────────────────────────────────────────────
    useEffect(() => {
        // Existing peer in channel when we join
        socket.on('rtc:peer-exists', ({ peerId }: { peerId: string }) => {
            createPeer(peerId, false); // they will send us an offer
        });

        // New peer joined after us — we initiate
        socket.on('rtc:peer-joined', ({ peerId }: { peerId: string }) => {
            createPeer(peerId, true);
        });

        socket.on('rtc:peer-left', ({ peerId }: { peerId: string }) => {
            removePeer(peerId);
        });

        socket.on('rtc:offer', async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
            if (!peersRef.current.has(from)) createPeer(from, false);
            const pc = peersRef.current.get(from)!;
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('rtc:answer', { to: from, answer });
        });

        socket.on('rtc:answer', async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
            const pc = peersRef.current.get(from);
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('rtc:ice', async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
            const pc = peersRef.current.get(from);
            if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        });

        return () => {
            socket.off('rtc:peer-exists');
            socket.off('rtc:peer-joined');
            socket.off('rtc:peer-left');
            socket.off('rtc:offer');
            socket.off('rtc:answer');
            socket.off('rtc:ice');
        };
    }, [socket, createPeer, removePeer]);

    // ── Cleanup all peers on unmount ────────────────────────────────────────────
    useEffect(() => {
        return () => {
            for (const peerId of peersRef.current.keys()) removePeer(peerId);
            ctxRef.current?.close();
        };
    }, [removePeer]);

    // ── Phase-based channel + mic switching ────────────────────────────────────
    useEffect(() => {
        if (!roomCode || !hasPermission) return;

        const { channel: targetChannel, micAllowed } = resolveChannel(phase, myRole, alive, aliveMafiaCount);

        // Switch channel if changed
        const prevChannel = channel;
        if (targetChannel !== prevChannel) {
            // Leave old channel
            if (roomCode) socket.emit('rtc:leave', { code: roomCode });
            // Close all existing peers — they were in the old channel
            for (const pid of [...peersRef.current.keys()]) removePeer(pid);
            setChannel(targetChannel);
        }

        // Join new channel
        socket.emit('rtc:join', { code: roomCode, channel: targetChannel });

        // Mic rule
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = micAllowed;
            setMicOn(micAllowed);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, myRole, alive, aliveMafiaCount, roomCode, hasPermission]);

    // ── Speaking detection — poll analysers at 10fps ───────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            const nowSpeaking = new Set<string>();
            const buf = new Uint8Array(256);
            for (const [pid, analyser] of analysersRef.current) {
                analyser.getByteFrequencyData(buf);
                const avg = buf.reduce((s, v) => s + v, 0) / buf.length;
                if (avg > 12) nowSpeaking.add(pid);
            }
            setSpeaking((prev) => {
                const changed = prev.size !== nowSpeaking.size ||
                    [...nowSpeaking].some((id) => !prev.has(id));
                return changed ? nowSpeaking : prev;
            });
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // ── Manual mic toggle ───────────────────────────────────────────────────────
    const toggleMic = useCallback(() => {
        const { micAllowed } = resolveChannel(phase, myRole, alive, aliveMafiaCount);
        if (!micAllowed) return; // phase rule blocks it
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setMicOn(track.enabled);
    }, [phase, myRole, alive, aliveMafiaCount]);

    return { micOn, channel, speaking, peers, hasPermission, toggleMic };
}
