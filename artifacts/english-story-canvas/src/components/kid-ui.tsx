/**
 * Shared, child-friendly building blocks for every chapter page.
 *
 * Layout rule used by all "play" pages:
 *   top bar  : home · chapter name · star counter · next scene
 *   middle   : the live canvas (the star of the page) with the "I heard…" bubble on top
 *   side     : big picture word cards
 *   bottom   : one big microphone in the middle, Undo on the left, Clear on the right
 */
import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, ArrowRight, Eraser, Home as HomeIcon, Mic, Undo2, Volume2 } from 'lucide-react';
import type { MicStatus } from '@/hooks/use-speech-words';
import type { HeardToken } from '@/lib/speech-match';

export type WordType = 'noun' | 'verb' | 'adverb';

export const wordTypeTone: Record<WordType, { tile: string; tag: string; chip: string; label: string }> = {
  noun: { tile: 'tile-noun', tag: 'bg-sky-100 text-sky-800', chip: 'bg-sky-100 text-sky-800 border-sky-300', label: 'noun' },
  verb: { tile: 'tile-verb', tag: 'bg-amber-100 text-amber-900', chip: 'bg-amber-100 text-amber-900 border-amber-300', label: 'verb' },
  adverb: { tile: 'tile-adverb', tag: 'bg-violet-100 text-violet-800', chip: 'bg-violet-100 text-violet-800 border-violet-300', label: 'adverb' },
};

export type PictureWord = { word: string; emoji: string; type: WordType };

// ---- Page frame ---------------------------------------------------------------

export function KidPage({ theme, children }: { theme: 'sun' | 'sky' | 'rain' | 'meadow'; children: ReactNode }) {
  return (
    <main className={`kid-shell kid-theme-${theme}`}>
      <div className="mx-auto flex min-h-[100dvh] max-w-[1320px] flex-col px-3 pb-52 sm:px-5 lg:pb-6">{children}</div>
    </main>
  );
}

export function TopBar({
  backHref = '/',
  backLabel = 'Home',
  emoji,
  title,
  subtitle,
  stars,
  next,
}: {
  backHref?: string;
  backLabel?: string;
  emoji: string;
  title: string;
  subtitle?: string;
  stars?: { value: number; total: number };
  next?: { href: string; label: string };
}) {
  const BackIcon = backHref === '/' ? HomeIcon : ArrowLeft;
  return (
    <header className="flex items-center gap-2 py-3 sm:gap-3 sm:py-4">
      <Link href={backHref} aria-label={backLabel} className="toy-button toy-white grid h-14 w-14 shrink-0 place-items-center rounded-full" data-testid="button-back">
        <BackIcon size={26} strokeWidth={2.6} />
      </Link>
      <div className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-full bg-white/85 py-1.5 pl-4 pr-5 shadow-[0_4px_0_rgba(60,72,88,.08)] sm:pl-1.5">
        <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fff3c4] text-2xl sm:grid" aria-hidden="true">{emoji}</span>
        <div className="min-w-0">
          <h1 className="font-display truncate text-xl font-semibold leading-tight text-[#2d3a4a] sm:text-2xl">{title}</h1>
          {subtitle && <p className="truncate text-xs font-bold text-[#6b7a8c] sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      {stars && (
        <div className="flex h-14 shrink-0 items-center gap-1 rounded-full bg-[#ffd84d] px-3 font-display text-xl sm:gap-1.5 sm:px-4 font-semibold text-[#6b4a00] shadow-[0_4px_0_#e0b419]" aria-label={`${stars.value} of ${stars.total} words played`} data-testid="text-words-played">
          <span aria-hidden="true">⭐</span>{stars.value}<span className="text-base opacity-60">/{stars.total}</span>
        </div>
      )}
      {next && (
        <Link href={next.href} className="toy-button toy-green flex h-14 shrink-0 items-center gap-1 rounded-full px-4 font-display text-lg font-semibold" data-testid="button-next-scene">
          <span className="hidden sm:inline">{next.label}</span><ArrowRight size={24} strokeWidth={2.6} />
        </Link>
      )}
    </header>
  );
}

export function PlayLayout({ canvas, dock, words }: { canvas: ReactNode; dock: ReactNode; words: ReactNode }) {
  return (
    <section className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-3">
        {canvas}
        {dock}
      </div>
      {words}
    </section>
  );
}

// ---- Canvas ---------------------------------------------------------------------

/**
 * White frame around a p5 canvas. `aspect` is the sketch's height ÷ width: on laptops the
 * frame narrows so the whole canvas, its caption and the mic fit on one screen without scrolling.
 */
export function CanvasFrame({ children, overlay, caption, aspect = 0.65 }: { children: ReactNode; overlay?: ReactNode; caption?: ReactNode; aspect?: number }) {
  return (
    <div className="canvas-frame fit-screen relative mx-auto w-full overflow-hidden rounded-[30px] bg-white p-2 sm:p-2.5" style={{ ['--canvas-aspect' as string]: aspect }}>
      <div className="relative overflow-hidden rounded-[24px]">
        {children}
        <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#e0533d]">
          <span className="live-dot h-2 w-2 rounded-full bg-[#ff5a3c]" /> live
        </span>
        {overlay && <div className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-6.5rem)]">{overlay}</div>}
      </div>
      {caption && <div className="flex justify-center px-2 pb-1 pt-2.5">{caption}</div>}
    </div>
  );
}

/** Speech bubble on the canvas: what the microphone is hearing right now, then the sentence it understood with the target words highlighted. */
export function HeardBubble({
  listening,
  interim,
  tokens,
  unmatched,
  message,
  types,
}: {
  listening: boolean;
  interim: string;
  tokens: HeardToken[];
  unmatched?: string;
  message?: string;
  types?: Record<string, WordType>;
}) {
  let body: ReactNode;
  if (interim) {
    body = <span className="italic text-[#6b7a8c]">“{interim}…”</span>;
  } else if (message) {
    body = <span>{message}</span>;
  } else if (tokens.length) {
    body = (
      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {tokens.map(({ text, word }, index) => word ? (
          <span key={`${text}-${index}`} className={`pop-in rounded-full border-2 px-2.5 py-px font-display text-lg font-semibold ${types?.[word] ? wordTypeTone[types[word]].chip : 'border-[#ffc2b3] bg-[#ffe9e3] text-[#b13a22]'}`}>{text}</span>
        ) : (
          <span key={`${text}-${index}`} className="text-base text-[#4b5a6b]">{text}</span>
        ))}
        <span aria-hidden="true" className="text-lg">✨</span>
      </span>
    );
  } else if (unmatched) {
    body = <span>I heard “{unmatched}” 🤔<span className="block text-xs text-[#6b7a8c]">Try a picture word! 试试图片上的词</span></span>;
  } else {
    body = listening
      ? <span>I’m listening… 👂<span className="block text-xs text-[#6b7a8c]">我在听，说吧！</span></span>
      : <span>Tap the mic and talk! 🎤<span className="block text-xs text-[#6b7a8c]">点麦克风，说英语</span></span>;
  }
  return (
    <div className="heard-bubble rounded-[20px] bg-white/95 px-3.5 py-2 text-sm font-extrabold leading-snug text-[#2d3a4a] shadow-[0_5px_0_rgba(45,58,74,.12)]" role="status" aria-live="polite" data-testid="text-latest-heard">
      {body}
    </div>
  );
}

export function StoryCaption({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[680px] text-center font-display text-lg font-medium leading-snug text-[#2d3a4a] sm:text-xl" data-testid="text-story-sentence">
      {children}
    </p>
  );
}

// ---- Controls -----------------------------------------------------------------------

const micCopy: Record<MicStatus, { en: string; zh: string }> = {
  idle: { en: 'Tap & talk', zh: '点我说话' },
  listening: { en: 'Listening…', zh: '我在听，再点一下停' },
  unsupported: { en: 'Tap the pictures', zh: '这个浏览器不能听，点图片玩' },
  blocked: { en: 'Mic is off', zh: '请允许使用麦克风' },
  offline: { en: 'Can’t reach the listener', zh: '语音服务连不上，点图片玩' },
};

export function MicButton({ status, level, onToggle }: { status: MicStatus; level: number; onToggle: () => void }) {
  const listening = status === 'listening';
  const disabled = status === 'unsupported';
  const ring = listening ? 1 + Math.min(level, 1) * 0.3 : 1;
  return (
    <div className="flex flex-col items-center">
      <div className="relative grid h-[112px] w-[112px] place-items-center">
        {listening && (
          <>
            <span className="absolute inset-0 rounded-full bg-[#3fc382]/25 transition-transform duration-75" style={{ transform: `scale(${ring})` }} aria-hidden="true" />
            <span className="mic-wave absolute inset-0 rounded-full border-4 border-[#3fc382]/40" aria-hidden="true" />
          </>
        )}
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-pressed={listening}
          aria-label={listening ? 'Stop listening' : 'Start listening'}
          data-testid="button-toggle-listening"
          className={`toy-button relative grid h-[104px] w-[104px] place-items-center rounded-full ${listening ? 'toy-green' : disabled ? 'toy-grey' : 'toy-coral'}`}
        >
          <Mic size={46} strokeWidth={2.4} />
        </button>
      </div>
      <p className="relative z-10 mt-1 text-center font-display text-lg font-semibold leading-tight text-[#2d3a4a]">{micCopy[status].en}</p>
      <p className="relative z-10 text-center text-xs font-bold text-[#6b7a8c]">{micCopy[status].zh}</p>
    </div>
  );
}

export function RoundTool({ kind, onClick, disabled }: { kind: 'undo' | 'clear'; onClick: () => void; disabled?: boolean }) {
  const Icon = kind === 'undo' ? Undo2 : Eraser;
  return (
    <div className="flex w-20 flex-col items-center">
      <button type="button" onClick={onClick} disabled={disabled} aria-label={kind === 'undo' ? 'Undo' : 'Clear the canvas'} data-testid={`button-${kind}`} className="toy-button toy-white grid h-16 w-16 place-items-center rounded-full disabled:opacity-45">
        <Icon size={28} strokeWidth={2.5} />
      </button>
      <p className="mt-1 text-center font-display text-sm font-semibold leading-tight text-[#2d3a4a]">{kind === 'undo' ? 'Undo' : 'Clear'}</p>
      <p className="text-center text-[11px] font-bold text-[#6b7a8c]">{kind === 'undo' ? '退一步' : '清空'}</p>
    </div>
  );
}

/** Big round mic in the middle, Undo on the left, Clear on the right. Sticks to the bottom on phones and tablets. */
export function ControlDock({ mic, onUndo, onClear, undoDisabled }: { mic: ReactNode; onUndo: () => void; onClear: () => void; undoDisabled?: boolean }) {
  return (
    <div className="control-dock fixed inset-x-0 bottom-0 z-20 lg:static">
      <div className="mx-auto flex max-w-md items-end justify-center gap-6 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 sm:gap-10">
        <RoundTool kind="undo" onClick={onUndo} disabled={undoDisabled} />
        {mic}
        <RoundTool kind="clear" onClick={onClear} />
      </div>
    </div>
  );
}

// ---- Word cards -------------------------------------------------------------------

export function WordTray({ words, played, onPick, title = 'Picture words', subtitle = '点一点，听一听，再说一说' }: {
  words: PictureWord[];
  played: Set<string>;
  onPick: (word: string) => void;
  title?: string;
  subtitle?: string;
}) {
  return (
    <aside className="rounded-[28px] bg-white/75 p-3 shadow-[0_6px_0_rgba(45,58,74,.07)] sm:p-4" aria-label="Picture words">
      <div className="mb-3 flex items-center gap-2 px-1">
        <Volume2 size={20} className="text-[#e0533d]" />
        <div>
          <h2 className="font-display text-lg font-semibold leading-tight text-[#2d3a4a]">{title}</h2>
          <p className="text-xs font-bold text-[#6b7a8c]">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5 lg:grid-cols-2">
        {words.map(({ word, emoji, type }) => (
          <button
            key={word}
            type="button"
            onClick={() => onPick(word)}
            data-testid={`button-word-${word}`}
            className={`word-tile toy-button ${wordTypeTone[type].tile} relative flex min-h-[96px] flex-col items-center justify-center rounded-[20px] px-1 pb-2 pt-3 sm:min-h-[104px] sm:rounded-[22px]`}
          >
            {played.has(word) && <span className="absolute right-1.5 top-1 text-base" aria-label="played">⭐</span>}
            <span className="text-[34px] leading-none sm:text-[40px]" aria-hidden="true">{emoji}</span>
            <span className="mt-1.5 font-display text-[15px] font-semibold leading-none text-[#2d3a4a] sm:text-lg">{word}</span>
            <span className={`mt-1.5 rounded-full px-2 py-px text-[10px] font-black ${wordTypeTone[type].tag}`}>{wordTypeTone[type].label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
