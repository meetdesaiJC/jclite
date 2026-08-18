import { useLayoutEffect, useRef, useState } from "react";

const NOTES_SHARE = 0.42;
const GAP = 12;
const HEADER_FALLBACK = 44;
const INPUT_READY_MS = 150;

const EASE_OUT = cubicBezier(0.2, 0, 0, 1);
const EASE_CLOSE = cubicBezier(0.4, 0, 0.2, 1);

type NotesMotionFrame = {
  notesH: number;
  notesOpacity: number;
  innerOpacity: number;
  innerY: number;
  transcriptTop: number;
  transcriptH: number;
};

type MotionTiming = {
  notesDelay: number;
  notesDuration: number;
  notesEase: (t: number) => number;
  transcriptDelay: number;
  transcriptDuration: number;
  transcriptEase: (t: number) => number;
  innerDelay: number;
  innerDuration: number;
  innerEase: (t: number) => number;
};

/**
 * Notes ↔ transcript share one column. Heights are driven together so the
 * transcript can vacate space before Notes fills it, and follow Notes back up
 * on close — never overlapping.
 */
export function useNotesTranscriptMotion({
  open,
  transcriptExpanded,
  reduced,
}: {
  open: boolean;
  transcriptExpanded: boolean;
  reduced: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const notesInnerRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const frameRef = useRef<NotesMotionFrame | null>(null);
  const rafRef = useRef<number>(0);
  const animatingRef = useRef(false);
  const prevOpenRef = useRef(open);
  const prevExpandedRef = useRef(transcriptExpanded);
  const bootedRef = useRef(false);

  const [interactive, setInteractive] = useState(false);
  const [announced, setAnnounced] = useState(open);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    animatingRef.current = false;
    const notes = notesRef.current;
    const transcript = transcriptRef.current;
    if (notes) notes.style.willChange = "";
    if (transcript) transcript.style.willChange = "";
  };

  const measureColumn = () => stageRef.current?.clientHeight ?? 0;

  const measureHeader = () => {
    const header = transcriptRef.current?.querySelector("header");
    return header?.getBoundingClientRect().height || HEADER_FALLBACK;
  };

  const targetFrame = (nextOpen: boolean, expanded: boolean, columnH: number): NotesMotionFrame => {
    const headerH = measureHeader();
    if (!expanded) {
      if (!nextOpen) {
        return {
          notesH: 0,
          notesOpacity: 0,
          innerOpacity: 0,
          innerY: 4,
          transcriptTop: 0,
          transcriptH: headerH,
        };
      }
      const notesH = Math.max(0, columnH - headerH - GAP);
      return {
        notesH,
        notesOpacity: 1,
        innerOpacity: 1,
        innerY: 0,
        transcriptTop: notesH + GAP,
        transcriptH: headerH,
      };
    }
    if (!nextOpen) {
      return {
        notesH: 0,
        notesOpacity: 0,
        innerOpacity: 0,
        innerY: 4,
        transcriptTop: 0,
        transcriptH: columnH,
      };
    }
    const notesH = Math.round(columnH * NOTES_SHARE);
    const transcriptH = Math.max(headerH, columnH - notesH - GAP);
    return {
      notesH,
      notesOpacity: 1,
      innerOpacity: 1,
      innerY: 0,
      transcriptTop: notesH + GAP,
      transcriptH,
    };
  };

  const applyFrame = (frame: NotesMotionFrame) => {
    frameRef.current = frame;
    const notes = notesRef.current;
    const inner = notesInnerRef.current;
    const transcript = transcriptRef.current;
    if (!notes || !transcript) return;

    const gap = frame.notesH > 0.5 ? GAP : 0;
    const transcriptTop = Math.max(frame.transcriptTop, frame.notesH + gap);
    const card = notes.firstElementChild as HTMLElement | null;

    notes.style.height = `${frame.notesH}px`;
    notes.style.overflow =
      animatingRef.current || frame.notesH < 1 ? "hidden" : "visible";
    notes.style.visibility =
      frame.notesH < 0.5 && frame.notesOpacity < 0.02 ? "hidden" : "visible";
    if (card) card.style.opacity = String(frame.notesOpacity);
    transcript.style.top = `${transcriptTop}px`;
    transcript.style.height = `${frame.transcriptH}px`;

    if (inner) {
      inner.style.opacity = String(frame.innerOpacity);
      inner.style.transform = `translateY(${frame.innerY}px)`;
    }
  };

  const timingFor = (nextOpen: boolean, stagger: boolean): MotionTiming => {
    if (!stagger) {
      return {
        notesDelay: 0,
        notesDuration: 220,
        notesEase: EASE_OUT,
        transcriptDelay: 0,
        transcriptDuration: 220,
        transcriptEase: EASE_OUT,
        innerDelay: nextOpen ? 0 : 0,
        innerDuration: nextOpen ? 140 : 100,
        innerEase: EASE_OUT,
      };
    }
    if (nextOpen) {
      return {
        notesDelay: 80,
        notesDuration: 230,
        notesEase: EASE_OUT,
        transcriptDelay: 0,
        transcriptDuration: 220,
        transcriptEase: EASE_OUT,
        innerDelay: 80,
        innerDuration: 140,
        innerEase: EASE_OUT,
      };
    }
    return {
      notesDelay: 40,
      notesDuration: 200,
      notesEase: EASE_CLOSE,
      transcriptDelay: 60,
      transcriptDuration: 220,
      transcriptEase: EASE_OUT,
      innerDelay: 0,
      innerDuration: 100,
      innerEase: EASE_CLOSE,
    };
  };

  const play = (nextOpen: boolean, expanded: boolean, stagger: boolean) => {
    const columnH = measureColumn();
    if (!columnH) return;

    const from = frameRef.current ?? targetFrame(nextOpen, expanded, columnH);
    const to = targetFrame(nextOpen, expanded, columnH);

    if (sameFrame(from, to)) {
      applyFrame(to);
      setInteractive(nextOpen);
      setAnnounced(nextOpen);
      return;
    }

    if (reduced) {
      stop();
      applyFrame(to);
      setInteractive(nextOpen);
      setAnnounced(nextOpen);
      return;
    }

    stop();
    animatingRef.current = true;
    setAnnounced(true);
    if (!nextOpen) setInteractive(false);
    else if (from.notesH > to.notesH * 0.35) setInteractive(true);
    else setInteractive(false);

    const notes = notesRef.current;
    const transcript = transcriptRef.current;
    if (notes) notes.style.willChange = "height";
    if (transcript) transcript.style.willChange = "height, top";

    const timing = timingFor(nextOpen, stagger);
    const innerFromY = from.innerY;
    const innerToY = nextOpen ? 0 : -2;
    const start = performance.now();
    let armedInput = nextOpen && (from.notesH > to.notesH * 0.35);

    const tick = (now: number) => {
      const elapsed = now - start;
      const notesT = unit(elapsed, timing.notesDelay, timing.notesDuration, timing.notesEase);
      const vacT = unit(elapsed, timing.transcriptDelay, timing.transcriptDuration, timing.transcriptEase);
      const innerT = unit(elapsed, timing.innerDelay, timing.innerDuration, timing.innerEase);

      applyFrame({
        notesH: lerp(from.notesH, to.notesH, notesT),
        notesOpacity: lerp(from.notesOpacity, to.notesOpacity, notesT),
        innerOpacity: lerp(from.innerOpacity, to.innerOpacity, innerT),
        innerY: lerp(innerFromY, innerToY, innerT),
        transcriptTop: lerp(from.transcriptTop, to.transcriptTop, vacT),
        transcriptH: lerp(from.transcriptH, to.transcriptH, vacT),
      });

      if (nextOpen && !armedInput && elapsed >= INPUT_READY_MS) {
        armedInput = true;
        setInteractive(true);
      }

      const done =
        notesT >= 1 &&
        vacT >= 1 &&
        innerT >= 1;

      if (!done) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      rafRef.current = 0;
      animatingRef.current = false;
      applyFrame(to);
      const notesEl = notesRef.current;
      const transcriptEl = transcriptRef.current;
      if (notesEl) notesEl.style.willChange = "";
      if (transcriptEl) transcriptEl.style.willChange = "";
      setInteractive(nextOpen);
      setAnnounced(nextOpen);
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  useLayoutEffect(() => {
    const columnH = measureColumn();
    if (!columnH) return;

    if (!bootedRef.current) {
      bootedRef.current = true;
      prevOpenRef.current = open;
      prevExpandedRef.current = transcriptExpanded;
      applyFrame(targetFrame(open, transcriptExpanded, columnH));
      setInteractive(open);
      setAnnounced(open);
      return;
    }

    const openChanged = prevOpenRef.current !== open;
    prevOpenRef.current = open;
    prevExpandedRef.current = transcriptExpanded;
    play(open, transcriptExpanded, openChanged);
    return () => stop();
    // layout is re-driven only when the split's inputs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transcriptExpanded, reduced]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => {
      const columnH = measureColumn();
      if (!columnH) return;
      if (!bootedRef.current) {
        bootedRef.current = true;
        prevOpenRef.current = open;
        prevExpandedRef.current = transcriptExpanded;
        applyFrame(targetFrame(open, transcriptExpanded, columnH));
        setInteractive(open);
        setAnnounced(open);
        return;
      }
      if (animatingRef.current) return;
      applyFrame(targetFrame(open, transcriptExpanded, columnH));
    });
    ro.observe(stage);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transcriptExpanded]);

  return {
    stageRef,
    notesRef,
    notesInnerRef,
    transcriptRef,
    interactive,
    announced,
  };
}

function sameFrame(a: NotesMotionFrame, b: NotesMotionFrame) {
  return (
    Math.abs(a.notesH - b.notesH) < 0.5 &&
    Math.abs(a.transcriptH - b.transcriptH) < 0.5 &&
    Math.abs(a.transcriptTop - b.transcriptTop) < 0.5
  );
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function unit(
  elapsed: number,
  delay: number,
  duration: number,
  ease: (t: number) => number
) {
  const t = (elapsed - delay) / duration;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return ease(t);
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solveT = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleDX(t);
      if (Math.abs(dx) < 1e-6) break;
      const delta = sampleX(t) - x;
      if (Math.abs(delta) < 1e-6) break;
      t -= delta / dx;
    }
    return t;
  };

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleY(solveT(x));
  };
}
