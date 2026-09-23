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
  Link,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

type Word = 'apple' | 'bee' | 'eat' | 'fly';
type SpeechResultLike = ArrayLike<{ transcript: string }> & { isFinal?: boolean };
type SpeechLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<SpeechResultLike> }) => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechConstructor = new () => SpeechLike;

const vocabulary: Array<{ word: Word; hint: string; color: string }> = [
  { word: 'apple', hint: 'a red fruit', color: 'coral' },
  { word: 'bee', hint: 'a buzzy friend', color: 'yellow' },
  { word: 'eat', hint: 'take a silly bite', color: 'peach' },
  { word: 'fly', hint: 'zoom in the sky', color: 'lavender' },
];

const wordAliases: Record<Word, string[]> = {
  apple: ['apple', 'apples'],
  bee: ['bee', 'bees', 'be', 'b'],
  eat: ['eat', 'eats', 'eating', 'ate'],
  fly: ['fly', 'flies', 'flying'],
};

function findWords(transcript: string): Word[] {
  const tokens = transcript.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  return tokens.flatMap((token) => {
    const match = vocabulary.find(({ word }) => wordAliases[word].includes(token));
    return match ? [match.word] : [];
  });
}

function sentenceForWords(words: Word[]) {
  if (!words.length) return 'Your silly story will grow here…';
  const sequence = words.join(' ');
  if (sequence.includes('apple eat bee')) return 'The apple grew a giant mouth and chased the flying bee, but never caught it. CHOMP!';
  if (sequence.includes('bee eat apple')) return 'The bee grew a giant mouth, chased the apple, and finally bit it on the ground. CHOMP!';
  if (sequence.includes('apple fly')) return 'The apple sprouted wings and flew like a very confused bird.';
  if (sequence.includes('bee fly')) return 'The bee zoomed away, leaving a tiny yellow blur.';
  if (sequence.includes('eat bee')) return 'Something hungry is chasing the bee. Run, bee, run!';
  if (sequence.includes('eat apple')) return 'Someone is nibbling the apple. The apple is not impressed.';
  if (sequence.includes('apple bee')) return 'The apple met the bee. They both stared. Nobody blinked.';
  if (sequence.includes('bee apple')) return 'The bee found an apple and immediately made a very bad plan.';
  return `${words.join(' ')}… what will happen next?`;
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
      let previousSequence = '';
      let appleRevealFrame = -1;
      let actionStartFrame = -1;
      let referenceArtwork: p5.Image;
      const getWords = () => activeRef.current;
      const has = (word: Word) => getWords().includes(word);
      const hasInOrder = (sequence: Word[]) => {
        let cursor = 0;
        for (const word of getWords()) {
          if (word === sequence[cursor]) cursor += 1;
          if (cursor === sequence.length) return true;
        }
        return false;
      };
      canvas.setup = () => {
        referenceArtwork = canvas.loadImage('/yan-tree-apple.jpg');
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
        const sequence = getWords().join(' ');
        if (sequence !== previousSequence) {
          if (!previousSequence.includes('apple') && sequence.includes('apple')) {
            appleRevealFrame = canvas.frameCount;
          }
          if (!sequence.includes('apple')) appleRevealFrame = -1;
          if (
            (!previousSequence.includes('bee eat apple') && sequence.includes('bee eat apple')) ||
            (!previousSequence.includes('apple eat bee') && sequence.includes('apple eat bee'))
          ) {
            actionStartFrame = canvas.frameCount;
          }
          if (!sequence.includes('bee eat apple') && !sequence.includes('apple eat bee')) {
            actionStartFrame = -1;
          }
          previousSequence = sequence;
        }
        const appleEatBee = hasInOrder(['apple', 'eat', 'bee']);
        const beeEatApple = hasInOrder(['bee', 'eat', 'apple']);
        const appleHasMouth = hasInOrder(['apple', 'eat']);
        const beeHasMouth = hasInOrder(['bee', 'eat']);
        const appleFlies = hasInOrder(['apple', 'fly']);
        const beeFlies = hasInOrder(['bee', 'fly']);
        const appleFlying = appleFlies && !appleEatBee;
        const beeFlying = beeFlies && !appleEatBee;
        const appleHomeX = w * 0.68;
        const appleHomeY = h * 0.53;
        const appleGroundY = h * 0.76 - 22;
        const appleGroundX = w * 0.62;
        const appleFrames = Math.max(0, canvas.frameCount - (appleRevealFrame < 0 ? canvas.frameCount : appleRevealFrame));
        const actionFrames = Math.max(0, canvas.frameCount - (actionStartFrame < 0 ? canvas.frameCount : actionStartFrame));
        const revealProgress = Math.min(1, appleFrames / 36);
        const revealEase = 1 - Math.pow(1 - revealProgress, 3);
        const appleScale = has('apple') ? 0.16 + revealEase * 0.84 : 0;
        const appleEatBeeFall = appleEatBee ? Math.min(1, Math.max(0, (actionFrames - 42) / 34)) : 0;
        const appleEatBeeShake = appleEatBee && appleEatBeeFall < 1
          ? Math.sin(canvas.frameCount * 1.08) * 7 * (1 - appleEatBeeFall)
          : 0;
        const beeEatAppleChase = beeEatApple ? Math.min(1, actionFrames / 105) : 0;
        const beeEatAppleFall = beeEatApple ? Math.min(1, Math.max(0, (actionFrames - 105) / 35)) : 0;
        const beeAppleShake = beeEatApple && actionFrames >= 72 && actionFrames < 105
          ? Math.sin(canvas.frameCount * 1.05) * 7
          : 0;
        const beeX = appleEatBee
          ? w * 0.26 + Math.sin(canvas.frameCount * 0.18) * 22
          : beeEatApple
            ? beeEatAppleFall > 0
              ? appleGroundX - 27
              : w * 0.24 + (appleHomeX - 42 - w * 0.24) * beeEatAppleChase + Math.sin(canvas.frameCount * 0.2) * 5
            : beeFlies
              ? w * 0.42 + Math.sin(canvas.frameCount * 0.08) * 72
              : w * 0.39 + Math.sin(canvas.frameCount * 0.045) * 24;
        const beeY = appleEatBee
          ? h * 0.3 + Math.cos(canvas.frameCount * 0.24) * 36
          : beeEatApple
            ? beeEatAppleFall > 0
              ? h * 0.53 + (appleGroundY - h * 0.53) * beeEatAppleFall - 4
              : h * 0.5 + Math.cos(canvas.frameCount * 0.16) * 10
            : beeFlies
              ? h * 0.27 + Math.cos(canvas.frameCount * 0.11) * 44
              : h * 0.34 + Math.cos(canvas.frameCount * 0.06) * 14;
        const appleX = appleEatBee
          ? appleHomeX + appleEatBeeShake
          : beeEatApple
            ? appleHomeX + Math.sin(canvas.frameCount * 0.14) * 18 + beeAppleShake
            : appleFlying
              ? w * 0.62 + Math.sin(canvas.frameCount * 0.06) * 42
              : appleHomeX;
        const appleY = appleEatBee
          ? appleHomeY + (appleGroundY - appleHomeY) * appleEatBeeFall
          : beeEatApple
            ? appleHomeY + (appleGroundY - appleHomeY) * beeEatAppleFall
            : appleFlying
              ? h * 0.38 + Math.cos(canvas.frameCount * 0.08) * 38
              : appleHomeY;
        // Yan's artwork supplies the warm paper, leafy tree, and hand-painted apples.
        canvas.background('#fff8a5');
        if (referenceArtwork?.width) {
          const scale = Math.max(w / referenceArtwork.width, h / referenceArtwork.height);
          const imageWidth = referenceArtwork.width * scale;
          const imageHeight = referenceArtwork.height * scale;
          const imageX = (w - imageWidth) / 2;
          const imageY = (h - imageHeight) / 2;
          canvas.image(referenceArtwork, imageX, imageY, imageWidth, imageHeight);
          // Hide the source painting's standalone apple so only the spoken vector apple appears.
          const sourceAppleX = 886;
          const sourceAppleY = 319;
          const sourceAppleRadius = 72;
          canvas.push();
          canvas.fill('#fff8a5');
          canvas.ellipse(
            imageX + sourceAppleX * scale,
            imageY + sourceAppleY * scale,
            sourceAppleRadius * 2 * scale,
            sourceAppleRadius * 1.65 * scale,
          );
          canvas.pop();
        }
        // The extracted vector apple appears only after the learner says “apple”.
        if (has('apple')) {
          canvas.push();
          canvas.translate(appleX, appleY);
          canvas.scale(appleScale);
          if (appleFlying) {
            canvas.fill('#edf8f4'); canvas.ellipse(-22, -24, 30, 17); canvas.ellipse(22, -24, 30, 17);
            canvas.fill('#d4eee8'); canvas.ellipse(-22, -24, 16, 10); canvas.ellipse(22, -24, 16, 10);
          }
          // Hand-painted apple silhouette, matched to Yan's original fruit.
          canvas.fill('#ff6948');
          canvas.beginShape();
          canvas.vertex(-1, -29);
          canvas.bezierVertex(-18, -39, -39, -27, -42, -7);
          canvas.bezierVertex(-46, 17, -29, 38, -3, 42);
          canvas.bezierVertex(20, 45, 41, 28, 43, 4);
          canvas.bezierVertex(45, -18, 28, -34, 10, -31);
          canvas.bezierVertex(5, -30, 2, -28, -1, -29);
          canvas.endShape(canvas.CLOSE);
          canvas.fill('#a96616');
          canvas.noFill();
          canvas.stroke('#a96616');
          canvas.strokeWeight(5);
          canvas.strokeCap(canvas.ROUND);
          canvas.bezier(1, -28, 2, -38, 12, -39, 14, -48);
          canvas.noStroke();
          canvas.fill('#f6a51b');
          canvas.ellipse(-12, 2, 12, 18);
          if (appleHasMouth && !appleEatBee) {
            const chomp = Math.abs(Math.sin(canvas.frameCount * 0.22)) * 14 + 5;
            canvas.fill('#382b38'); canvas.ellipse(12, 5, 20, 20 + chomp * 0.2);
            canvas.fill('#fff9e9');
            canvas.ellipse(13, 3, 7, 5);
            canvas.fill('#243b53'); canvas.circle(-8, -5, 4); canvas.circle(9, -7, 4);
          }
          if (beeEatApple && beeEatAppleFall > 0.82) {
            canvas.fill('#382b38');
            canvas.circle(-21, 5, 8);
          }
          canvas.pop();
        }
        // bee with looping flight path
        if (has('bee')) {
          const bx = beeX;
          const by = beeY;
          canvas.noFill(); canvas.stroke('#f2af2d'); canvas.strokeWeight(2); canvas.drawingContext.setLineDash([5, 6]);
          canvas.bezier(bx - 54, by + 12, bx - 24, by - 30, bx + 44, by + 38, bx + 58, by - 8);
          canvas.drawingContext.setLineDash([]); canvas.noStroke();
          canvas.fill('#f5c84b'); canvas.ellipse(bx, by, 48, 28);
          canvas.fill('#243b53'); canvas.rect(bx - 9, by - 14, 7, 28, 4); canvas.rect(bx + 7, by - 14, 7, 28, 4);
          const flap = Math.sin(canvas.frameCount * (beeFlying ? 0.5 : 0.3)) * 5;
          canvas.fill('#edf8f4'); canvas.ellipse(bx - 13, by - 20 - flap, 22, 14); canvas.ellipse(bx + 14, by - 20 + flap, 22, 14);
          canvas.fill('#243b53'); canvas.circle(bx + 22, by - 2, 4); canvas.circle(bx + 10, by - 5, 4);
          if (beeEatApple) {
            // An oversized, friendly mouth makes the bite readable at a glance.
            const mouthOpen = 20 + Math.abs(Math.sin(canvas.frameCount * 0.24)) * 9;
            canvas.fill('#382b38'); canvas.ellipse(bx + 25, by + 6, 25, mouthOpen);
            canvas.fill('#f38e9b'); canvas.ellipse(bx + 30, by + 13, 13, 7);
            canvas.fill('#fff9e9'); canvas.ellipse(bx + 20, by - 2, 7, 6);
          } else if (beeHasMouth) {
            canvas.noFill(); canvas.stroke('#243b53'); canvas.strokeWeight(2);
            canvas.arc(bx + 21, by + 5, 10, 9, 0, canvas.PI);
            canvas.noStroke();
          }
        }
        // little story footprints / motion trails
        if (appleFlying || beeFlying || beeEatApple) {
          canvas.noFill(); canvas.stroke('#ee8c73'); canvas.strokeWeight(3);
          canvas.arc(w * .5, h * .29, 150, 80, canvas.PI + .2, canvas.TWO_PI - .2);
          canvas.noStroke();
        }
        if (appleEatBee) {
          canvas.fill('#243b53'); canvas.textAlign(canvas.CENTER, canvas.CENTER); canvas.textSize(13); canvas.textStyle(canvas.BOLD);
          canvas.text('apple says: “whoops!”', w * 0.5, h * 0.91);
        } else if (beeEatApple) {
          canvas.fill('#243b53'); canvas.textAlign(canvas.CENTER, canvas.CENTER); canvas.textSize(13); canvas.textStyle(canvas.BOLD);
          canvas.text('bee says: “one giant bite!”', w * 0.5, h * 0.91);
        }
      };
    };
    const instance = new p5(sketch);
    return () => instance.remove();
  }, []);

  return <div ref={holderRef} data-testid="canvas-story-world" className="h-full w-full overflow-hidden rounded-[22px] [&>canvas]:block" aria-label="Animated story world" role="img" />;
}

function ChapterCard({
  number,
  eyebrow,
  title,
  description,
  href,
  tone,
  disabled = false,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  tone: 'green' | 'orange';
  disabled?: boolean;
}) {
  const content = (
    <div className={`group relative flex min-h-[210px] flex-col justify-between overflow-hidden rounded-[26px] p-6 transition-transform ${disabled ? 'cursor-default opacity-70' : 'hover:-translate-y-1'} ${tone === 'green' ? 'bg-sidebar text-sidebar-foreground' : 'bg-accent text-accent-foreground'}`}>
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full border-[18px] border-current opacity-15" />
      <div className="relative flex items-start justify-between">
        <p className="mono-label opacity-70">{number} / {eyebrow}</p>
        {!disabled && <ArrowRight className="transition-transform group-hover:translate-x-1" size={22} />}
      </div>
      <div className="relative">
        <h2 className="max-w-[360px] text-3xl font-black tracking-[-.06em]">{title}</h2>
        <p className="mt-2 max-w-[330px] text-sm font-semibold leading-relaxed opacity-75">{description}</p>
      </div>
    </div>
  );
  return disabled ? content : <Link href={href}>{content}</Link>;
}

function Landing() {
  return (
    <main className="story-shell text-foreground">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1200px] flex-col px-5 pb-8 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between py-6 sm:py-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 rotate-[-5deg] place-items-center rounded-[14px] bg-primary text-primary-foreground soft-shadow"><BookOpen size={23} strokeWidth={2.5} /></div>
            <div><p className="text-[17px] font-black leading-none tracking-[-.03em]">Story Canvas</p><p className="mono-label mt-1 text-muted-foreground">a little book of moving pictures</p></div>
          </div>
          <p className="hidden text-xs font-bold text-muted-foreground sm:block">English playground · 2026</p>
        </header>
        <section className="flex flex-1 flex-col justify-center py-8">
          <div className="max-w-[760px]">
            <p className="mono-label mb-4 text-primary">a story in chapters</p>
            <h1 className="text-[clamp(3.5rem,10vw,8rem)] font-black leading-[.85] tracking-[-.09em]">Make something<br /><span className="text-secondary">move.</span></h1>
            <p className="mt-7 max-w-[540px] text-lg font-semibold leading-relaxed text-muted-foreground">Speak a word, watch a world appear, and follow the little accidents that happen next.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            <ChapterCard number="01" eyebrow="make a story" title="Your voice draws the world." description="Build a silly English story with a hand-painted tree, a bee, and an apple that waits for its cue." href="/story" tone="green" />
            <ChapterCard number="02" eyebrow="moving nature" title="Let the garden breathe." description="A new chapter is growing here. Soon, the leaves, flowers, and tiny creatures will move with you." href="/moving-nature" tone="orange" />
          </div>
        </section>
        <footer className="flex items-center justify-between border-t border-border/70 pt-5 text-xs font-semibold text-muted-foreground"><span>chapter 01 is ready to play</span><span>和大人一起玩</span></footer>
      </div>
    </main>
  );
}

function MovingNature() {
  return (
    <main className="story-shell grid min-h-[100dvh] place-items-center px-5 text-foreground">
      <section className="max-w-[560px] rounded-[28px] bg-card p-8 text-center scribble-border sm:p-12">
        <p className="mono-label text-primary">02 / moving nature</p>
        <h1 className="mt-3 text-5xl font-black tracking-[-.08em]">The garden is waking up.</h1>
        <p className="mt-5 font-semibold leading-relaxed text-muted-foreground">This chapter is still growing. Come back after you finish making a story.</p>
        <Link href="/" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 font-black text-primary-foreground transition-transform hover:-translate-y-0.5"><ArrowRight className="rotate-180" size={18} /> Back to chapters</Link>
      </section>
    </main>
  );
}

function Home() {
  const [heard, setHeard] = useState('');
  const [words, setWords] = useState<Word[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Say one word, or build a silly phrase.');
  const [unsupported, setUnsupported] = useState(false);
  const recognitionRef = useRef<SpeechLike | null>(null);
  const supported = useMemo(() => typeof window !== 'undefined' && Boolean((window as Window & { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: SpeechConstructor }).webkitSpeechRecognition), []);

  useEffect(() => {
    if (!supported) {
      setUnsupported(true);
      setStatus('Microphone words are not available in this browser. Try the four buttons below.');
      return;
    }
    const speechWindow = window as Window & { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => { setIsListening(true); setStatus('Listening… say one word or a silly phrase.'); };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setIsListening(false);
      setStatus(event.error === 'not-allowed' ? 'Microphone access is off. You can still tap an example word.' : 'I missed that. Let’s try one more time.');
    };
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) => event.results[index][0].transcript).join(' ');
      setHeard(transcript);
      const lastResult = event.results[event.results.length - 1];
      if (!lastResult?.isFinal) return;
      const spokenWords = findWords(transcript);
      if (spokenWords.length) addWords(spokenWords, transcript);
      else setStatus('I heard you, but try one of the four silly story words.');
    };
    recognitionRef.current = recognition;
    return () => { recognition.stop(); recognitionRef.current = null; };
  }, [supported]);

  const addWords = useCallback((newWords: Word[], spokenText: string = newWords.join(' ')) => {
    setHeard(spokenText);
    setWords((current) => [...current, ...newWords]);
    setStatus(`${newWords.join(' + ')} joined the story. What a silly idea!`);
  }, []);

  const addWord = (word: Word) => addWords([word]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setUnsupported(true);
      return;
    }
    if (isListening) recognitionRef.current.stop();
    else {
      setHeard('');
      setStatus('Listening… say one word or a silly phrase.');
      try { recognitionRef.current.start(); } catch { setStatus('The microphone is busy. Please tap again.'); }
    }
  };

  const resetStory = () => {
    setWords([]);
    setHeard('');
    setStatus('A fresh page! Try making a silly word recipe.');
  };

  const sentence = sentenceForWords(words);
  const foundCount = vocabulary.filter(({ word }) => words.includes(word)).length;
  const recipe = words.length ? words.join('  +  ') : 'Your word recipe will appear here';

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
                 words played
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
                   <h2 className="mt-1 text-2xl font-black tracking-[-.04em]">Make a silly recipe</h2>
                     <p className="mt-1 text-xs font-semibold text-sidebar-foreground/65">自由组合四个词</p>
                  </div>
                  <div className={`grid h-11 w-11 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground ${isListening ? 'listen-ring' : ''}`}>
                    {isListening ? <Waves size={20} /> : <Mic size={20} />}
                  </div>
                </div>
                <button onClick={toggleListening} disabled={unsupported} data-testid="button-toggle-listening" className="flex min-h-[68px] w-full items-center justify-between rounded-[17px] bg-sidebar-primary px-5 text-left text-lg font-black text-sidebar-primary-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55">
                   <span>{unsupported ? 'Microphone unavailable' : isListening ? 'Listening…' : 'Say a word or a phrase'}</span>
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
                   <p className="mt-1 text-xs font-semibold text-muted-foreground">你的搞笑故事</p>
                </div>
                <BookOpen size={18} className="text-primary" />
              </div>
               <p className="min-h-[58px] rounded-[15px] border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-lg font-extrabold leading-snug text-foreground" data-testid="text-story-sentence">{sentence}</p>
               <div className="mt-3 rounded-[13px] bg-muted px-3 py-2 font-mono text-xs font-bold tracking-wide text-muted-foreground" data-testid="text-word-recipe">
                 {recipe}
               </div>
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="rounded-[24px] bg-card p-5 scribble-border sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mono-label text-primary">02 / silly word lab</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-.05em]">Only four words. Endless trouble.</h2>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">Tap or say a word. Try them in a new order.</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-black text-secondary" data-testid="text-vocabulary-progress">
                <span className="text-2xl">{foundCount}</span><span className="text-muted-foreground">/ 4 words found</span>
              </div>
            </div>
            <div className="mb-5 h-3 overflow-hidden rounded-full bg-muted" aria-label={`${foundCount} of 4 vocabulary words found`}>
              <div className="h-full rounded-full bg-secondary transition-[width] duration-500" style={{ width: `${(foundCount / 4) * 100}%` }} />
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
        <Route path="/" component={Landing} />
        <Route path="/story" component={Home} />
        <Route path="/moving-nature" component={MovingNature} />
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
