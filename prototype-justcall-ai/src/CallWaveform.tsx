import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * The live trace in the middle of the call bar. A synthesised conversation
 * runs underneath for the whole call, and the microphone rides on top of it
 * when the browser hands one over, so the bar is never a dead strip. Muted or
 * on hold, the trace settles onto the idle line.
 */

const BAR_WIDTH = 3;
const BAR_GAP = 3;
/** One new sample enters at the right edge on this beat, whatever the frame rate. */
const SAMPLE_MS = 64;
const IDLE_LEVEL = 0.05;
/** Below this the stream is room tone, not speech, and the mic stays out of it. */
const MIC_SIGNAL = 0.06;

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  const audioWindow = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

/**
 * A turn in the conversation. Turns alternate between the two sides and the
 * lengths vary, so the trace never settles into a loop the eye can follow. The
 * gap between turns is a breath, not a hang-up: its floor stays above the
 * minimum bar so a live call never reads as a dead strip.
 */
type Turn = { endsAt: number; rate: number; drive: number; floor: number };

function nextTurn(nowMs: number, speaking: boolean): Turn {
  return speaking
    ? {
        endsAt: nowMs + 1500 + Math.random() * 2600,
        // The two sides sit at different syllable rates, so a change of turn
        // is legible in the trace.
        rate: 5.4 + Math.random() * 3.4,
        drive: 0.82 + Math.random() * 0.18,
        floor: 0.18,
      }
    : {
        endsAt: nowMs + 340 + Math.random() * 520,
        rate: 4.2,
        drive: 0.34,
        // Clears the minimum bar even after the per-sample jitter trims it.
        floor: 0.15,
      };
}

/** Speech shaped: syllables under a slower stress pattern. */
function turnLevel(nowMs: number, turn: Turn): number {
  const t = nowMs / 1000;
  const syllables =
    Math.abs(Math.sin(t * turn.rate)) * 0.7 +
    Math.abs(Math.sin(t * turn.rate * 1.63)) * 0.3;
  const stress = 0.66 + 0.34 * Math.abs(Math.sin(t * 1.9));
  return Math.min(1, Math.max(turn.floor, turn.drive * syllables * stress));
}

export function CallWaveform({
  active,
  muted,
  onHold,
  reduced,
  className,
}: {
  active: boolean;
  muted: boolean;
  onHold: boolean;
  reduced: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const silentRef = useRef(false);
  silentRef.current = muted || onHold;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const barCount = () =>
      Math.max(1, Math.floor((width + BAR_GAP) / (BAR_WIDTH + BAR_GAP)));

    const paint = (samples: number[]) => {
      ctx.clearRect(0, 0, width, height);
      const middle = height / 2;
      const radius = BAR_WIDTH / 2;
      const last = Math.max(1, samples.length - 1);

      samples.forEach((level, index) => {
        const bar = Math.max(BAR_WIDTH, level * height);
        const x = index * (BAR_WIDTH + BAR_GAP);
        // Newest is at the right, so the trace brightens as it arrives and
        // dims as it travels off the left edge.
        ctx.fillStyle = `rgba(255, 255, 255, ${0.24 + 0.56 * (index / last)})`;
        ctx.beginPath();
        ctx.roundRect(x, middle - bar / 2, BAR_WIDTH, bar, radius);
        ctx.fill();
      });
    };

    const observer = new ResizeObserver(() => {
      resize();
      if (reduced || !active) paint(new Array(barCount()).fill(IDLE_LEVEL));
    });
    observer.observe(canvas);
    resize();

    if (reduced || !active) {
      paint(new Array(barCount()).fill(IDLE_LEVEL));
      return () => observer.disconnect();
    }

    let stopped = false;
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let timeDomain: Uint8Array | null = null;

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((granted) => {
        if (stopped) {
          granted.getTracks().forEach((track) => track.stop());
          return;
        }
        const Ctor = audioContextCtor();
        if (!Ctor) {
          granted.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = granted;
        context = new Ctor();
        const source = context.createMediaStreamSource(granted);
        analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.65;
        source.connect(analyser);
        timeDomain = new Uint8Array(analyser.fftSize);
      })
      .catch(() => {
        /* No mic, or the user said no — the synthesised envelope carries it. */
      });

    // A blocked or muted stream still resolves and reads as room tone, and a
    // real one is quiet for most of a call — the agent is listening more than
    // they are talking. So the mic never leads on its own: the conversation
    // carries the trace and the mic only adds to it when someone is actually
    // heard over it. Otherwise a granted-but-quiet mic flatlines the bar for
    // the rest of the call.
    const read = (now: number, turn: Turn) => {
      if (silentRef.current) return 0;
      const conversation = turnLevel(now, turn);
      if (!analyser || !timeDomain) return conversation;

      analyser.getByteTimeDomainData(timeDomain);
      let sum = 0;
      for (let index = 0; index < timeDomain.length; index += 1) {
        const value = (timeDomain[index]! - 128) / 128;
        sum += value * value;
      }
      const level = Math.min(1, Math.sqrt(sum / timeDomain.length) * 3.4);
      return level > MIC_SIGNAL ? Math.max(conversation, level) : conversation;
    };

    const samples: number[] = [];
    let smoothed = 0;
    let lastSample = performance.now();
    let frame = 0;
    let speaking = true;
    let turn = nextTurn(lastSample, speaking);

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);

      if (now >= turn.endsAt) {
        speaking = !speaking;
        turn = nextTurn(now, speaking);
      }
      smoothed += (read(now, turn) - smoothed) * 0.3;

      // Catch up in whole beats; a backgrounded tab resumes without a burst.
      const beats = Math.min(4, Math.floor((now - lastSample) / SAMPLE_MS));
      if (beats > 0) lastSample += beats * SAMPLE_MS;
      for (let step = 0; step < beats; step += 1) {
        samples.push(Math.max(IDLE_LEVEL, smoothed * (0.78 + Math.random() * 0.44)));
      }

      const count = barCount();
      while (samples.length > count) samples.shift();
      while (samples.length < count) samples.unshift(IDLE_LEVEL);
      paint(samples);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      stream?.getTracks().forEach((track) => track.stop());
      void context?.close();
    };
  }, [active, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("mx-auto block h-8 w-full max-w-[420px]", className)}
    />
  );
}
