import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import p5 from 'p5';
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleHelp,
  Eraser,
  Flower2,
  Headphones,
  Info,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  Volume2,
  Waves,
} from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

type Word = 'apple' | 'bee' | 'flower' | 'fly' | 'eat' | 'happy' | 'big' | 'small';
type SpeechLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechConstructor = new () => SpeechLike;

const vocabulary: Array<{ word: Word; hint: string; color: string }> = [
  { word: 'apple', hint: 'a red fruit', color: 'coral' },
  { word: 'bee', hint: 'a tiny helper', color: 'yellow' },
  { word: 'flower', hint: 'a bright bloom', color: 'teal' },
  { word: 'fly', hint: 'move in the sky', color: 'lavender' },
  { word: 'eat', hint: 'take a bite', color: 'peach' },
  { word: 'happy', hint: 'a good feeling', color: 'mint' },
  { word: 'big', hint: 'not small', color: 'sun' },
  { word: 'small', hint: 'little in size', color: 'sky' },
];

const wordAliases: Record<Word, string[]> = {
  apple: ['apple', 'apples'],
  bee: ['bee', 'bees', 'b'],
  flower: ['flower', 'flowers', 'flour'],
  fly: ['fly', 'flies', 'flying'],
  eat: ['eat', 'eats', 'eating', 'ate'],
  happy: ['happy', 'happily'],
  big: ['big', 'bigger'],
  small: ['small', 'little', 'tiny'],
};

function findWord(transcript: string): Word | null {
  const normalized = transcript.toLowerCase().replace(/[^a-z\s]/g, ' ');
  return vocabulary.find(({ word }) => wordAliases[word].some((alias) => normalized.split(/\s+/).includes(alias) || normalized.includes(alias)))?.word ?? null;
}

function sentenceForWords(words: Word[]) {
  if (!words.length) return 'Your story will grow here…';
  const has = (word: Word) => words.includes(word);
  const size = has('big') ? 'big ' : has('small') ? 'small ' : '';
  let sentence = `${has('happy') ? 'A happy ' : 'A '}${size}${has('apple') ? 'apple' : 'little story'}`;
  if (has('bee')) sentence += ' and a bee';
  if (has('flower')) sentence += ' near a flower';
  if (has('fly')) sentence += has('bee') ? ' that can fly' : ' that can fly';
  if (has('eat')) sentence += ' that can eat';
  if (has('happy') && !sentence.startsWith('A happy')) sentence += ' feeling happy';
  return `${sentence}.`;
}

function StoryCanvas({ activeWords }: { activeWords: Word[] }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(activeWords);
  activeRef.current = activeWords;

  useEffect(() => {
    if (!holderRef.current) return;
    const sketch = (canvas: p5) => {
      let w = 620;
      let h = 420;
      const getWords = () => activeRef.current;
      const has = (word: Word) => getWords().includes(word);
      canvas.setup = () => {
        const box = holderRef.current?.getBoundingClientRect();
        w = Math.max(280, Math.floor(box?.width ?? 620));
        h = Math.max(300, Math.min(460, Math.floor(w * 0.63)));
        canvas.createCanvas(w, h).parent(holderRef.current as HTMLElement);
        canvas.frameRate(30);
      };
      canvas.windowResized = () => {
        const box = holderRef.current?.getBoundingClientRect();
        if (box) {
          w = Math.max(280, Math.floor(box.width));
          h = Math.max(300, Math.min(460, Math.floor(w * 0.63)));
          canvas.resizeCanvas(w, h);
        }
      };
      canvas.draw = () => {
        canvas.clear();
        canvas.noStroke();
        canvas.background('#dff3f0');
        // soft sun and hand-drawn clouds
        canvas.fill('#ffcf52'); canvas.circle(w * .84, h * .16, 72);
        canvas.fill('#fff9e9');
        canvas.ellipse(w * .18, h * .18, 122, 36);
        canvas.ellipse(w * .27, h * .14, 92, 32);
        // distant hills
        canvas.fill('#9bd4c2');
        canvas.arc(w * .25, h * .72, w * .72, h * .7, canvas.PI, canvas.TWO_PI);
        canvas.fill('#76bdad');
        canvas.arc(w * .75, h * .78, w * .9, h * .72, canvas.PI, canvas.TWO_PI);
        // ground
        canvas.fill('#f6ce7a'); canvas.rect(0, h * .76, w, h * .24);
        // flower stems and blooms
        if (has('flower')) {
          for (let i = 0; i < 5; i += 1) {
            const x = w * (.19 + i * .13);
            const sway = Math.sin(canvas.frameCount * .025 + i) * 4;
            canvas.stroke('#318e82'); canvas.strokeWeight(4); canvas.line(x, h * .78, x + sway, h * (.58 + (i % 2) * .04));
            canvas.noStroke(); canvas.fill(i % 2 ? '#ef7865' : '#f4a9ba');
            canvas.circle(x + sway, h * (.56 + (i % 2) * .04), 18);
            canvas.fill('#ffcf52'); canvas.circle(x + sway, h * (.56 + (i % 2) * .04), 7);
          }
        }
        // apple tree / apple
        if (has('apple') || getWords().length === 0) {
          canvas.fill('#9a654a'); canvas.rect(w * .68, h * .53, 18, h * .3, 8);
          canvas.fill('#318e82'); canvas.ellipse(w * .68, h * .5, 150, 118);
          canvas.fill('#439f86'); canvas.ellipse(w * .78, h * .47, 108, 95);
          canvas.fill('#e96f5e'); canvas.circle(w * .68, h * .53, has('big') ? 42 : 30);
          canvas.fill('#7d4c39'); canvas.rect(w * .67, h * .49, 5, 14, 2);
          canvas.fill('#f4a9ba'); canvas.ellipse(w * .675, h * .525, 7, 12);
        }
        // bee with looping flight path
        if (has('bee')) {
          const bx = w * .38 + Math.sin(canvas.frameCount * .045) * 24;
          const by = h * .34 + Math.cos(canvas.frameCount * .06) * 14;
          canvas.noFill(); canvas.stroke('#f2af2d'); canvas.strokeWeight(2); canvas.drawingContext.setLineDash([5, 6]);
          canvas.bezier(bx - 54, by + 12, bx - 24, by - 30, bx + 44, by + 38, bx + 58, by - 8);
          canvas.drawingContext.setLineDash([]); canvas.noStroke();
          canvas.fill('#f5c84b'); canvas.ellipse(bx, by, 48, 28);
          canvas.fill('#243b53'); canvas.rect(bx - 9, by - 14, 7, 28, 4); canvas.rect(bx + 7, by - 14, 7, 28, 4);
          canvas.fill('#edf8f4'); canvas.ellipse(bx - 13, by - 20, 22, 14); canvas.ellipse(bx + 14, by - 20, 22, 14);
          canvas.fill('#243b53'); canvas.circle(bx + 22, by - 2, 4);
        }
        // little story footprints / motion trails
        if (has('fly')) {
          canvas.noFill(); canvas.stroke('#ee8c73'); canvas.strokeWeight(3);
          canvas.arc(w * .44, h * .28, 110, 60, canvas.PI + .2, canvas.TWO_PI - .2);
        }
      };
    };
    const instance = new p5(sketch);
    return () => instance.remove();
  }, []);

  return <div ref={holderRef} data-testid="canvas-story-world" className="h-full w-full overflow-hidden rounded-[22px] [&>canvas]:block" aria-label="Animated story world" role="img" />;
}

function Home() {
  const [heard, setHeard] = useState('');
  const [words, setWords] = useState<Word[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Tap the microphone, then say a word.');
  const [unsupported, setUnsupported] = useState(false);
  const recognitionRef = useRef<SpeechLike | null>(null);
  const supported = useMemo(() => typeof window !== 'undefined' && Boolean((window as Window & { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: SpeechConstructor }).webkitSpeechRecognition), []);

  useEffect(() => {
    if (!supported) {
      setUnsupported(true);
      setStatus('Microphone words are not available in this browser. Try an example word below.');
      return;
    }
    const speechWindow = window as Window & { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => { setIsListening(true); setStatus('Listening… say one English word.'); };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setIsListening(false);
      setStatus(event.error === 'not-allowed' ? 'Microphone access is off. You can still tap an example word.' : 'I missed that. Let’s try one more time.');
    };
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) => event.results[index][0].transcript).join(' ');
      setHeard(transcript);
      const match = findWord(transcript);
      if (match) addWord(match, transcript);
      else setStatus('I heard you, but try one of the eight story words.');
    };
    recognitionRef.current = recognition;
    return () => { recognition.stop(); recognitionRef.current = null; };
  }, [supported]);

  const addWord = useCallback((word: Word, spokenText: string = word) => {
    setHeard(spokenText);
    setWords((current) => current.includes(word) ? current : [...current, word]);
    setStatus(`Nice speaking! “${word}” joined the story.`);
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setUnsupported(true);
      return;
    }
    if (isListening) recognitionRef.current.stop();
    else {
      setHeard('');
      setStatus('Listening… say one English word.');
      try { recognitionRef.current.start(); } catch { setStatus('The microphone is busy. Please tap again.'); }
    }
  };

  const resetStory = () => {
    setWords([]);
    setHeard('');
    setStatus('A fresh page! Tap the microphone, then say a word.');
  };

  const sentence = sentenceForWords(words);

  return (
    <main className="story-shell text-foreground">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1440px] flex-col px-4 pb-8 sm:px-7 lg:px-10">
        <header className="flex items-center justify-between py-5 sm:py-7">
          <div className="flex items-center gap-3" data-testid="brand-story-canvas">
            <div className="grid h-11 w-11 rotate-[-5deg] place-items-center rounded-[14px] bg-primary text-primary-foreground soft-shadow">
              <BookOpen size={23} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[17px] font-black leading-none tracking-[-.03em]">Story Canvas</p>
              <p className="mono-label mt-1 text-muted-foreground">English playground</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-card px-3 py-2 text-xs font-bold text-muted-foreground scribble-border sm:flex">
            <Sparkles size={14} className="text-primary" /> Speak. Watch. Build.
          </div>
          <button onClick={resetStory} data-testid="button-reset-story" className="flex min-h-11 items-center gap-2 rounded-full border-2 border-border bg-card px-3.5 text-sm font-extrabold transition-transform hover:-translate-y-0.5 active:translate-y-0">
            <RotateCcw size={16} /> <span className="hidden sm:inline">Start over</span>
          </button>
        </header>

        <section className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(330px,.75fr)] lg:gap-8">
          <div className="flex min-w-0 flex-col">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="mono-label mb-2 text-primary">01 / make a story</p>
                <h1 className="max-w-[740px] text-[clamp(2.25rem,6vw,5.3rem)] font-black leading-[.92] tracking-[-.07em]">
                  Your voice<br /><span className="text-secondary">draws the world.</span>
                </h1>
              </div>
              <div className="hidden shrink-0 -rotate-3 rounded-[12px] bg-accent px-3 py-2 text-center text-xs font-black text-accent-foreground sm:block">
                <span className="block text-lg leading-none">{words.length}</span>
                words found
              </div>
            </div>
            <div className="paper-shadow canvas-grid relative flex min-h-[330px] flex-1 overflow-hidden rounded-[28px] bg-card p-2 sm:min-h-[430px] sm:p-3">
              <StoryCanvas activeWords={words} />
              <div className="absolute left-5 top-5 rounded-full bg-card/90 px-3 py-1.5 text-[11px] font-extrabold text-secondary scribble-border backdrop-blur-sm">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-secondary" /> live canvas
              </div>
              <div className="absolute bottom-5 left-5 max-w-[190px] rounded-[14px] bg-card/90 px-3 py-2 text-xs font-bold leading-snug scribble-border backdrop-blur-sm">
                Every word adds a new detail.
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-4 lg:pt-10">
            <div className="relative overflow-hidden rounded-[24px] bg-sidebar p-5 text-sidebar-foreground soft-shadow sm:p-6">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-[14px] border-sidebar-primary/25" />
              <div className="relative">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="mono-label text-sidebar-primary">your turn</p>
                    <h2 className="mt-1 text-2xl font-black tracking-[-.04em]">Say one word</h2>
                    <p className="mt-1 text-xs font-semibold text-sidebar-foreground/65">说一个英文单词</p>
                  </div>
                  <div className={`grid h-11 w-11 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground ${isListening ? 'listen-ring' : ''}`}>
                    {isListening ? <Waves size={20} /> : <Mic size={20} />}
                  </div>
                </div>
                <button onClick={toggleListening} disabled={unsupported} data-testid="button-toggle-listening" className="flex min-h-[68px] w-full items-center justify-between rounded-[17px] bg-sidebar-primary px-5 text-left text-lg font-black text-sidebar-primary-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55">
                  <span>{unsupported ? 'Microphone unavailable' : isListening ? 'Listening…' : 'Start listening'}</span>
                  {isListening ? <MicOff size={22} /> : <ArrowRight size={23} />}
                </button>
                <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-sidebar-foreground/70" data-testid="status-listening">
                  <span className={`h-2 w-2 rounded-full ${isListening ? 'bg-sidebar-primary' : 'bg-sidebar-foreground/35'}`} />
                  {status}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] bg-card p-5 scribble-border sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="mono-label text-muted-foreground">latest sound</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">刚刚听到</p>
                </div>
                <Volume2 size={18} className="text-secondary" />
              </div>
              <div className="flex min-h-[58px] items-center rounded-[15px] bg-muted px-4 text-xl font-black tracking-[-.03em]" data-testid="text-latest-heard">
                {heard || <span className="text-muted-foreground/55">Say something…</span>}
              </div>
            </div>

            <div className="rounded-[24px] bg-card p-5 scribble-border sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="mono-label text-muted-foreground">story sentence</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">你的故事句子</p>
                </div>
                <BookOpen size={18} className="text-primary" />
              </div>
              <p className="min-h-[58px] rounded-[15px] border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-lg font-extrabold leading-snug text-foreground" data-testid="text-story-sentence">{sentence}</p>
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="rounded-[24px] bg-card p-5 scribble-border sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mono-label text-primary">02 / word garden</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-.05em]">Try these story words</h2>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">Tap a word to add it — or say it aloud.</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-black text-secondary" data-testid="text-vocabulary-progress">
                <span className="text-2xl">{words.length}</span><span className="text-muted-foreground">/ 8 found</span>
              </div>
            </div>
            <div className="mb-5 h-3 overflow-hidden rounded-full bg-muted" aria-label={`${words.length} of 8 vocabulary words found`}>
              <div className="h-full rounded-full bg-secondary transition-[width] duration-500" style={{ width: `${(words.length / 8) * 100}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {vocabulary.map(({ word, hint, color }) => {
                const found = words.includes(word);
                return (
                  <button key={word} onClick={() => addWord(word)} data-testid={`button-word-${word}`} className={`group relative min-h-[86px] rounded-[16px] border-2 p-3 text-left transition-transform hover:-translate-y-1 active:translate-y-0 ${found ? 'border-secondary bg-secondary/10' : 'border-border bg-background'}`}>
                    <span className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ${color === 'coral' ? 'bg-primary' : color === 'yellow' || color === 'sun' ? 'bg-accent' : color === 'teal' || color === 'mint' ? 'bg-secondary' : 'bg-[#b7a4da]'}`} />
                    <span className="block text-lg font-black tracking-[-.04em]">{word}</span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-muted-foreground">{hint}</span>
                    {found && <Check size={16} className="absolute bottom-3 right-3 text-secondary" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="dot-field flex min-h-[150px] flex-col justify-between rounded-[24px] bg-accent p-5 text-accent-foreground sm:min-w-[220px] sm:p-6">
            <div className="flex items-start justify-between">
              <CircleHelp size={23} />
              <Flower2 className="wiggle" size={30} />
            </div>
            <div>
              <p className="text-lg font-black leading-tight">Need a little help?</p>
              <p className="mt-1 text-xs font-bold leading-snug opacity-70">Listen for the word, then repeat it.</p>
            </div>
          </div>
        </section>

        <footer className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5 text-xs font-semibold text-muted-foreground">
          <p className="flex items-center gap-2"><Headphones size={14} /> Best with a grown-up nearby <span className="text-muted-foreground/60">|</span> 和大人一起玩</p>
          <p className="flex items-center gap-2"><Info size={14} /> Microphone uses English (US) recognition</p>
        </footer>
      </div>
    </main>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
