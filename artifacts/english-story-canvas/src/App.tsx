import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import p5 from 'p5';
import {
  ArrowRight,
  ArrowDown,
  Bot,
  BookOpen,
  Check,
  Cloud,
  CircleHelp,
  Eraser,
  Flower2,
  Headphones,
  Info,
  Leaf,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  RotateCcw,
  Sparkles,
  Volume2,
  Waves,
  Wind,
} from 'lucide-react';
import {
  Link,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
      let beeRevealFrame = -1;
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
          if (!previousSequence.includes('bee') && sequence.includes('bee')) {
            beeRevealFrame = canvas.frameCount;
          }
          if (!sequence.includes('apple')) appleRevealFrame = -1;
          if (!sequence.includes('bee')) beeRevealFrame = -1;
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
        const hasChaseAction = appleEatBee || beeEatApple;
        const appleFlying = appleFlies && !hasChaseAction;
        const beeFlying = beeFlies && !hasChaseAction;
        const appleEating = appleHasMouth && !hasChaseAction;
        const beeEating = beeHasMouth && !hasChaseAction;
        const appleHomeX = w * 0.68;
        const appleHomeY = h * 0.53;
        const appleGroundY = h * 0.76 - 22;
        const appleGroundX = w * 0.62;
        const appleFrames = Math.max(0, canvas.frameCount - (appleRevealFrame < 0 ? canvas.frameCount : appleRevealFrame));
        const beeFrames = Math.max(0, canvas.frameCount - (beeRevealFrame < 0 ? canvas.frameCount : beeRevealFrame));
        const actionFrames = Math.max(0, canvas.frameCount - (actionStartFrame < 0 ? canvas.frameCount : actionStartFrame));
        const revealProgress = Math.min(1, appleFrames / 36);
        const revealEase = 1 - Math.pow(1 - revealProgress, 3);
        const appleScale = has('apple') ? 0.16 + revealEase * 0.84 : 0;
        const beeRevealProgress = Math.min(1, beeFrames / 28);
        const beeScale = has('bee') ? 0.35 + (1 - Math.pow(1 - beeRevealProgress, 3)) * 0.65 : 0;
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
          if (appleEating) {
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
          canvas.push();
          canvas.drawingContext.globalAlpha = beeScale;
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
          } else if (beeEating) {
            canvas.noFill(); canvas.stroke('#243b53'); canvas.strokeWeight(2);
            canvas.arc(bx + 21, by + 5, 10, 9, 0, canvas.PI);
            canvas.noStroke();
          }
          canvas.pop();
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
            <div><p className="text-[17px] font-black leading-none tracking-[-.03em]">DreamOral</p><p className="mono-label mt-1 text-muted-foreground">a little book of moving pictures</p></div>
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
            <ChapterCard number="02" eyebrow="moving nature" title="Everything moves in nature!" description="Tap wind and blow to hear English words and send a gust through the garden." href="/moving-nature" tone="orange" />
          </div>
        </section>
        <footer className="flex items-center justify-between border-t border-border/70 pt-5 text-xs font-semibold text-muted-foreground"><span>chapters 01 &amp; 02 are ready to play</span><span>Play with a friend<br />和朋友一起玩</span></footer>
      </div>
    </main>
  );
}

type NatureWord = 'wind' | 'blow';
type NatureAction = { word: NatureWord | null; id: number; strength: number };

function NatureCanvas({ action }: { action: NatureAction }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef(action);
  actionRef.current = action;

  useEffect(() => {
    if (!holderRef.current) return;
    const sketch = (canvas: p5) => {
      let w = 620;
      let h = 400;
      let previousActionId = actionRef.current.id;
      let actionStartFrame = 0;
      let actionWord: NatureWord | null = null;
      let actionStrength = 0.65;
      let leavesBlownAway = false;
      let cloudsBlownAway = false;

      canvas.setup = () => {
        const box = holderRef.current?.getBoundingClientRect();
        w = Math.max(280, Math.floor(box?.width ?? 620));
        h = Math.max(280, Math.min(430, Math.floor(w * 0.62)));
        canvas.createCanvas(w, h).parent(holderRef.current as HTMLElement);
        canvas.frameRate(30);
      };

      canvas.windowResized = () => {
        const box = holderRef.current?.getBoundingClientRect();
        if (box) {
          w = Math.max(280, Math.floor(box.width));
          h = Math.max(280, Math.min(430, Math.floor(w * 0.62)));
          canvas.resizeCanvas(w, h);
        }
      };

      canvas.draw = () => {
        const latestAction = actionRef.current;
        if (latestAction.id !== previousActionId) {
          previousActionId = latestAction.id;
          actionStartFrame = canvas.frameCount;
          actionWord = latestAction.word;
          actionStrength = latestAction.strength;
          leavesBlownAway = false;
          cloudsBlownAway = false;
        }

        const elapsed = actionWord ? canvas.frameCount - actionStartFrame : Infinity;
        const duration = (actionWord === 'blow' ? 105 : 75) * (0.7 + actionStrength * 0.6);
        const progress = Math.max(0, 1 - elapsed / duration);
        const blowProgress = Math.min(1, elapsed / duration);
        const settleProgress = Math.min(1, elapsed / duration);
        const settleEase = 1 - Math.pow(1 - settleProgress, 3);
        const gust = progress * progress;
        const isBlowing = actionWord === 'blow' && progress > 0;
        const isWindy = actionWord === 'wind' && progress > 0;
        if (actionWord === 'blow' && actionStrength >= 0.85 && blowProgress >= 0.82) {
          leavesBlownAway = true;
          cloudsBlownAway = true;
        }
        const treeSway = isBlowing
          ? Math.sin(elapsed * (0.13 + actionStrength * 0.12)) * (0.025 + actionStrength * 0.2) * gust
          : Math.sin(canvas.frameCount * 0.018) * 0.012;
        const canopySway = isBlowing
          ? actionStrength >= 0.85
            ? 0
            : Math.sin(elapsed * (0.13 + actionStrength * 0.12)) * (0.045 + actionStrength * 0.16) * (1 - settleProgress)
          : 0;
        const cloudShift = isBlowing
          ? actionStrength >= 0.85
            ? blowProgress * w * 1.15
            : (actionStrength < 0.4 ? w * 0.045 : w * 0.12) * settleEase
          : isWindy
            ? Math.sin(elapsed * 0.11) * w * 0.018 * actionStrength
            : 0;

        canvas.background('#bde8ef');
        canvas.noStroke();

        const drawCloud = (x: number, y: number, scale: number) => {
          canvas.push();
          canvas.translate(x, y);
          canvas.scale(scale);
          canvas.fill('#fffdf3');
          canvas.ellipse(-27, 5, 48, 27);
          canvas.ellipse(0, -7, 48, 40);
          canvas.ellipse(29, 5, 48, 27);
          canvas.ellipse(5, 12, 72, 24);
          canvas.fill('#d8f1ec');
          canvas.ellipse(-22, 13, 23, 8);
          canvas.pop();
        };

        if (!cloudsBlownAway) {
          drawCloud(w * 0.22 + cloudShift, h * 0.22, 0.9);
          drawCloud(w * 0.72 + cloudShift * 0.72, h * 0.16, 0.68);
        }

        canvas.fill('#a4d989');
        canvas.ellipse(w * 0.22, h * 0.79, w * 0.75, h * 0.53);
        canvas.fill('#80c878');
        canvas.ellipse(w * 0.78, h * 0.82, w * 0.82, h * 0.56);
        canvas.fill('#72b967');
        canvas.rect(0, h * 0.83, w, h * 0.17);

        canvas.push();
        canvas.translate(w * 0.72, h * 0.72);
        canvas.fill('#9a603e');
        canvas.beginShape();
        canvas.vertex(-15, h * 0.18);
        canvas.vertex(-10, -h * 0.28);
        canvas.vertex(-39, -h * 0.43);
        canvas.vertex(-34, -h * 0.47);
        canvas.vertex(-7, -h * 0.35);
        canvas.vertex(0, -h * 0.56);
        canvas.vertex(8, -h * 0.34);
        canvas.vertex(34, -h * 0.47);
        canvas.vertex(40, -h * 0.43);
        canvas.vertex(12, -h * 0.27);
        canvas.vertex(17, h * 0.18);
        canvas.endShape(canvas.CLOSE);
        canvas.pop();

        if (!leavesBlownAway) {
          const canopyFade = actionWord === 'blow' && actionStrength >= 0.85
            ? Math.max(0, 1 - Math.max(0, (blowProgress - 0.5) / 0.32))
            : 1;
          canvas.push();
          canvas.translate(w * 0.72, h * 0.72);
          canvas.rotate(treeSway + canopySway);
          canvas.drawingContext.globalAlpha = canopyFade;
          const canopy = [
            [-35, -h * 0.48, 76, 72, '#3caa70'],
            [12, -h * 0.55, 88, 85, '#36a96d'],
            [53, -h * 0.45, 72, 68, '#48b876'],
            [-5, -h * 0.39, 86, 72, '#4cbb78'],
            [30, -h * 0.34, 65, 60, '#2f9d65'],
          ] as const;
          canopy.forEach(([x, y, width, height, color]) => {
            canvas.fill(color);
            canvas.ellipse(x, y, width, height);
          });
          canvas.pop();
        }

        canvas.fill('#fff3a0');
        canvas.circle(w * 0.13, h * 0.16, 43);
        canvas.fill('#fff8c8');
        canvas.circle(w * 0.13, h * 0.16, 33);

        const leafCount = leavesBlownAway ? 0 : isBlowing ? Math.ceil(1 + actionStrength * 8) : isWindy ? Math.ceil(1 + actionStrength * 4) : 0;
        for (let index = 0; index < leafCount; index += 1) {
          const seed = index * 1.7;
          const leafSpeed = isBlowing ? 0.45 + actionStrength * actionStrength * 4.5 : 0.35 + actionStrength * 1.3;
          const travel = elapsed * leafSpeed + index * 47;
          const leafX = w * 0.72 + travel;
          const leafY = h * (0.24 + ((Math.sin(seed + elapsed * 0.08) + 1) * 0.1));
          canvas.push();
          canvas.translate(leafX, leafY);
          canvas.rotate(Math.sin(elapsed * 0.12 + seed) * 0.8);
          canvas.fill(index % 2 === 0 ? '#f2a64a' : '#e87655');
          canvas.ellipse(0, 0, 14, 7);
          canvas.pop();
        }

        if (isWindy || isBlowing) {
          const streakCount = isBlowing ? 8 : 5;
          for (let index = 0; index < streakCount; index += 1) {
            const travel = (elapsed * (isBlowing ? 3 + actionStrength * 6 : 2 + actionStrength * 4) + index * (w / streakCount)) % (w + 100);
            const lineY = h * (0.29 + (index % 4) * 0.105);
            const lineLength = isBlowing ? 38 + actionStrength * 44 : 28 + actionStrength * 24;
            canvas.push();
            canvas.drawingContext.globalAlpha = progress * (0.25 + actionStrength * 0.55);
            canvas.noFill();
            canvas.stroke(isBlowing ? '#fffdf3' : '#f8fff3');
            canvas.strokeWeight(isBlowing ? 3 : 2);
            canvas.arc(travel - 35, lineY, lineLength, 19, canvas.PI * 1.08, canvas.PI * 1.92);
            canvas.pop();
          }
        }

        canvas.noStroke();
        canvas.fill('#355b54');
        canvas.textAlign(canvas.CENTER, canvas.CENTER);
        canvas.textStyle(canvas.BOLD);
        canvas.textSize(14);
        if (actionWord === 'blow' && actionStrength >= 0.85 && leavesBlownAway) {
          canvas.textSize(11);
          canvas.text('the wind swept everything away!', w * 0.5, h * 0.91);
        } else if (isBlowing) canvas.text('whoooosh!', w * 0.5, h * 0.91);
        else if (isWindy) canvas.text('a little wind!', w * 0.5, h * 0.91);
      };
    };

    const instance = new p5(sketch);
    return () => instance.remove();
  }, []);

  return (
    <div
      ref={holderRef}
      data-testid="canvas-moving-nature"
      className="h-full w-full overflow-hidden rounded-[22px] [&>canvas]:block"
      role="img"
      aria-label="Garden scene with clouds and a tree that move when you blow"
    />
  );
}

function MovingNature() {
  const [action, setAction] = useState<NatureAction>({ word: null, id: 0, strength: 0 });
  const [activeWord, setActiveWord] = useState<NatureWord | null>(null);
  const [status, setStatus] = useState('Tap a word to hear it and make the garden move.');
  const [isHoldingMic, setIsHoldingMic] = useState(false);
  const [showVolumeGuide, setShowVolumeGuide] = useState(false);
  const [showVolumeToast, setShowVolumeToast] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'child' | 'bot'; text: string }>>([]);
  const [isBotLive, setIsBotLive] = useState(false);
  const [isBotListening, setIsBotListening] = useState(false);
  const [isReplySpeaking, setIsReplySpeaking] = useState(false);
  const [showBotHint, setShowBotHint] = useState(false);
  const [starBurst, setStarBurst] = useState(false);
  const [stars, setStars] = useState(0);
  const [flowStep, setFlowStep] = useState<'single-word' | 'phrase'>('single-word');
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<SpeechLike | null>(null);
  const pressActiveRef = useRef(false);
  const finishRequestedRef = useRef(false);
  const ignoreRecognitionEndRef = useRef(false);
  const transcriptRef = useRef('');
  const peakVolumeRef = useRef(0);
  const volumeTotalRef = useRef(0);
  const volumeSampleCountRef = useRef(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meterFrameRef = useRef<number | null>(null);
  const sequenceTimeoutRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const starTimeoutRef = useRef<number | null>(null);
  const reflectionTimeoutRef = useRef<number | null>(null);
  const botRecognitionRef = useRef<SpeechLike | null>(null);
  const botLiveRef = useRef(false);

  const stopMicrophoneMeter = () => {
    if (meterFrameRef.current !== null) {
      cancelAnimationFrame(meterFrameRef.current);
      meterFrameRef.current = null;
    }
    micSourceRef.current?.disconnect();
    micSourceRef.current = null;
    analyserRef.current = null;
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
  };

  useEffect(() => () => {
    pressActiveRef.current = false;
    ignoreRecognitionEndRef.current = true;
    finishRequestedRef.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (sequenceTimeoutRef.current !== null) {
      window.clearTimeout(sequenceTimeoutRef.current);
      sequenceTimeoutRef.current = null;
    }
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    if (starTimeoutRef.current !== null) window.clearTimeout(starTimeoutRef.current);
    if (reflectionTimeoutRef.current !== null) window.clearTimeout(reflectionTimeoutRef.current);
    botLiveRef.current = false;
    botRecognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    stopMicrophoneMeter();
    void audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  const playPronunciation = (word: NatureWord) => {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      return false;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.78;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      console.error('Unable to speak the selected word:', error);
      return false;
    }
  };

  const speakReflectionReply = (reply: string, onComplete?: () => void) => {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setStatus('Voice reply is not supported in this browser. / 此浏览器不支持语音回复。');
      onComplete?.();
      return;
    }
    window.speechSynthesis.cancel();
    const chunks = reply.match(/[^.!?。！？]+[.!?。！？]*/g) ?? [reply];
    const utterances = chunks.filter(Boolean).map((chunk) => {
      const utterance = new SpeechSynthesisUtterance(chunk.trim());
      utterance.lang = /[\u3400-\u9fff]/.test(chunk) ? 'zh-CN' : 'en-US';
      utterance.rate = 0.88;
      utterance.pitch = 1.08;
      return utterance;
    });
    if (utterances.length === 0) {
      onComplete?.();
      return;
    }
    setIsReplySpeaking(true);
    utterances.forEach((utterance, index) => {
      utterance.onend = () => {
        if (index === utterances.length - 1) {
          setIsReplySpeaking(false);
          onComplete?.();
        }
      };
      utterance.onerror = () => {
        setIsReplySpeaking(false);
        onComplete?.();
      };
      window.speechSynthesis.speak(utterance);
    });
  };

  const playWindSound = async (strength = 0.65) => {
    const AudioContextConstructor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) {
      return false;
    }

    const audioContext = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = audioContext;
    if (audioContext.state === 'suspended') await audioContext.resume();

    const duration = 1.15;
    const buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * duration), audioContext.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = Math.random() * 2 - 1;
    }

    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, now);
    filter.frequency.exponentialRampToValueAtTime(260, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22 * (0.2 + strength * 0.8), now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    source.start(now);
    source.stop(now + duration);
    return true;
  };

  const playRewardDing = async () => {
    const AudioContextConstructor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    const context = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = context;
    if (context.state === 'suspended') await context.resume();
    const now = context.currentTime;
    [880, 1320].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.08);
      gain.gain.setValueAtTime(0.0001, now + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.18, now + index * 0.08 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + index * 0.08);
      oscillator.stop(now + index * 0.08 + 0.24);
    });
  };

  const activateWord = async (
    word: NatureWord,
    strength = 0.65,
    spokenFeedback?: string,
    withAudio = true,
  ) => {
    if (sequenceTimeoutRef.current !== null) {
      window.clearTimeout(sequenceTimeoutRef.current);
      sequenceTimeoutRef.current = null;
    }
    setActiveWord(word);
    setAction((current) => ({ word, id: current.id + 1, strength }));
    const voiceAvailable = withAudio && playPronunciation(word);
    if (word === 'blow') {
      try {
        const soundAvailable = withAudio && await playWindSound(strength);
        const speechStatus = voiceAvailable ? '“Blow!”' : '';
        const soundStatus = soundAvailable
          ? 'The clouds drift, the tree sways, and the wind goes whoooosh.'
          : withAudio ? 'The garden moves, but wind sound is not supported in this browser.' : 'The garden responds to your voice.';
        setStatus(`${spokenFeedback ? `${spokenFeedback} · ` : ''}${speechStatus}${speechStatus ? ' ' : ''}${soundStatus}`);
      } catch (error) {
        console.error('Unable to play the wind sound:', error);
        setStatus(`${spokenFeedback ? `${spokenFeedback} · ` : ''}${withAudio ? `${voiceAvailable ? '“Blow!”' : 'Spoken pronunciation is not supported in this browser.'} The garden moved, but the wind sound could not be played.` : 'The garden responds to your voice.'}`);
      }
    } else {
      setStatus(voiceAvailable
        ? `${spokenFeedback ? `${spokenFeedback} · ` : ''}“Wind!” A gentle gust sweeps across the garden.`
        : `${spokenFeedback ? `${spokenFeedback} · ` : ''}A gentle gust sweeps across the garden. Spoken pronunciation is not supported in this browser.`);
    }
  };

  const showVolumePrompt = () => {
    setShowVolumeToast(true);
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      toastTimeoutRef.current = null;
      setShowVolumeToast(false);
    }, 3600);
  };

  const finishSpokenWords = () => {
    const transcript = transcriptRef.current.toLowerCase();
    const spokeWind = /\bwind\b/.test(transcript);
    const spokeBlow = /\bblow\b/.test(transcript);
    if (!spokeWind && !spokeBlow) {
      setStatus('I didn’t catch “wind” or “blow”. Try again. / 没听清，请再试一次。');
      return;
    }

    if (flowStep === 'single-word') {
      if (spokeWind && spokeBlow) {
        setStatus('Start with one word: “wind” or “blow”. / 第一步请只说一个单词：wind 或 blow。');
        return;
      }
      const word: NatureWord = spokeWind ? 'wind' : 'blow';
      setStars((current) => current + 1);
      setStarBurst(true);
      if (starTimeoutRef.current !== null) window.clearTimeout(starTimeoutRef.current);
      starTimeoutRef.current = window.setTimeout(() => setStarBurst(false), 1200);
      setFlowStep('phrase');
      void activateWord(word, 0.2, 'Great word! / 单词说得好！', false).then(() => {
        void playRewardDing();
        showVolumePrompt();
      });
      return;
    }

    if (!(spokeWind && spokeBlow)) {
      setStatus('Step 2 needs the full phrase “wind blow”. / 第二步请完整说出 wind blow。');
      return;
    }

    const averageVolume = volumeSampleCountRef.current > 0
      ? volumeTotalRef.current / volumeSampleCountRef.current
      : peakVolumeRef.current;
    const level = averageVolume < 0.035 ? 0 : averageVolume < 0.11 ? 1 : 2;
    const strength = [0.2, 0.58, 1][level];
    const levelMessage = [
      'A little breeze / 微风轻轻吹',
      'A breezy gust / 微风摇动树叶',
      'A big gust! / 大风吹走了树叶和云',
    ][level];
    const spokenFeedback = `${levelMessage} · Heard “${transcript.trim()}”`;
    void activateWord('blow', strength, spokenFeedback, false).then(() => {
      const animationDuration = strength >= 0.85 ? 3600 : 2600;
      if (reflectionTimeoutRef.current !== null) window.clearTimeout(reflectionTimeoutRef.current);
      reflectionTimeoutRef.current = window.setTimeout(() => {
        reflectionTimeoutRef.current = null;
        setShowBotHint(true);
      }, animationDuration);
    });
  };

  const askReflection = async (answer: string) => {
    const trimmed = answer.trim();
    if (!trimmed) return;
    setChatMessages((messages) => [...messages, { role: 'child', text: trimmed }]);
    try {
      const response = await fetch('/api/nature/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: trimmed }),
      });
      if (!response.ok) throw new Error(`Reflection request failed with ${response.status}`);
      const data = await response.json() as { reply?: string };
      const reply = data.reply || 'That is a lovely idea! The wind gave the clouds and leaves a little push. / 这是个可爱的想法！风给了云和树叶一点点推力。';
      setChatMessages((messages) => [...messages, { role: 'bot', text: reply }]);
      speakReflectionReply(reply, () => {
        if (botLiveRef.current) window.setTimeout(startBotListening, 250);
      });
    } catch (error) {
      console.error('Unable to get the nature reflection:', error);
      const reply = 'That is a lovely idea! The wind gave the clouds and leaves a little push. / 这是个可爱的想法！风给了云和树叶一点点推力。';
      setChatMessages((messages) => [...messages, { role: 'bot', text: reply }]);
      speakReflectionReply(reply, () => {
        if (botLiveRef.current) window.setTimeout(startBotListening, 250);
      });
    }
  };

  const startBotListening = () => {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechConstructor;
      webkitSpeechRecognition?: SpeechConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition || !botLiveRef.current || botRecognitionRef.current) return;
    const recognition = new Recognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;
    botRecognitionRef.current = recognition;
    setIsBotListening(true);
    recognition.onresult = (event) => {
      const answer = Array.from(
        { length: event.results.length },
        (_, index) => event.results[index]?.[0]?.transcript ?? '',
      ).join(' ');
      if (answer) void askReflection(answer);
    };
    recognition.onerror = (event) => {
      console.error('Reflection voice recognition failed:', event.error);
      setStatus('The little robot could not hear you. Try again. / 小机器人没有听清，再试一次吧。');
      setIsBotListening(false);
      botRecognitionRef.current = null;
    };
    recognition.onend = () => {
      setIsBotListening(false);
      botRecognitionRef.current = null;
    };
    try {
      recognition.start();
    } catch (error) {
      console.error('Unable to start robot voice recognition:', error);
      setIsBotListening(false);
      botRecognitionRef.current = null;
    }
  };

  const toggleBotChat = () => {
    if (isBotLive) {
      botLiveRef.current = false;
      botRecognitionRef.current?.stop();
      botRecognitionRef.current = null;
      window.speechSynthesis?.cancel();
      setIsBotLive(false);
      setIsBotListening(false);
      return;
    }
    setShowChatDialog(true);
    setShowBotHint(false);
    setIsBotLive(true);
    botLiveRef.current = true;
    if (chatMessages.length === 0) {
      const greeting = 'Hi, little explorer! Tell me what you noticed in the garden. / 你好，小小探索家！告诉我你在花园里发现了什么吧。';
      setChatMessages([{ role: 'bot', text: greeting }]);
      speakReflectionReply(greeting, () => window.setTimeout(startBotListening, 250));
    } else {
      startBotListening();
    }
  };

  const startMicrophoneMeter = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is not available in this browser.');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!pressActiveRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error('Microphone volume measurement is not supported.');
    }

    const audioContext = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = audioContext;
    if (audioContext.state === 'suspended') await audioContext.resume();
    if (!pressActiveRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    micStreamRef.current = stream;
    micSourceRef.current = source;
    analyserRef.current = analyser;
    const samples = new Float32Array(analyser.fftSize);

    const sampleVolume = () => {
      if (!pressActiveRef.current || !analyserRef.current) return;
      analyserRef.current.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) sum += sample * sample;
      const volume = Math.sqrt(sum / samples.length);
      peakVolumeRef.current = Math.max(peakVolumeRef.current, volume);
      volumeTotalRef.current += volume;
      volumeSampleCountRef.current += 1;
      meterFrameRef.current = requestAnimationFrame(sampleVolume);
    };
    sampleVolume();
  };

  const startSpeaking = async () => {
    if (pressActiveRef.current) return;
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechConstructor;
      webkitSpeechRecognition?: SpeechConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setStatus('Speech recognition is not supported here. Tap the wind or blow cards instead. / 此浏览器不支持语音识别，请点选单词卡。');
      return;
    }

    pressActiveRef.current = true;
    finishRequestedRef.current = false;
    if (sequenceTimeoutRef.current !== null) {
      window.clearTimeout(sequenceTimeoutRef.current);
      sequenceTimeoutRef.current = null;
    }
    ignoreRecognitionEndRef.current = false;
    transcriptRef.current = '';
    peakVolumeRef.current = 0;
    volumeTotalRef.current = 0;
    volumeSampleCountRef.current = 0;
    setIsHoldingMic(true);
    setStatus('Listening… say “wind”, then “blow”. / 正在听，请分别说 wind 和 blow。');

    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      transcriptRef.current = Array.from(
        { length: event.results.length },
        (_, index) => event.results[index]?.[0]?.transcript ?? '',
      ).join(' ');
      setStatus(`Listening: ${transcriptRef.current || '…'} / 正在听取语音…`);
    };
    recognition.onerror = (event) => {
      if (!pressActiveRef.current || event.error === 'aborted') return;
      pressActiveRef.current = false;
      setIsHoldingMic(false);
      ignoreRecognitionEndRef.current = true;
      recognitionRef.current = null;
      stopMicrophoneMeter();
      setStatus(event.error === 'not-allowed'
        ? 'Microphone access is off. Tap a word card instead. / 请允许麦克风权限，或直接点选单词卡。'
        : 'I couldn’t hear that clearly. Please try again. / 没听清，请再试一次。');
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (ignoreRecognitionEndRef.current) {
        ignoreRecognitionEndRef.current = false;
        return;
      }
      pressActiveRef.current = false;
      finishRequestedRef.current = false;
      setIsHoldingMic(false);
      stopMicrophoneMeter();
      finishSpokenWords();
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
      await startMicrophoneMeter();
    } catch (error) {
      console.error('Unable to start microphone input:', error);
      pressActiveRef.current = false;
      setIsHoldingMic(false);
      ignoreRecognitionEndRef.current = true;
      finishRequestedRef.current = true;
      try {
        recognition.stop();
      } catch (stopError) {
        console.error('Unable to stop speech recognition after microphone setup failed:', stopError);
      }
      recognitionRef.current = null;
      stopMicrophoneMeter();
      setStatus('Please allow microphone access to try speaking. / 请允许麦克风权限后再试。');
    }
  };

  const stopSpeaking = () => {
    if (!pressActiveRef.current) return;
    pressActiveRef.current = false;
    setIsHoldingMic(false);
    finishRequestedRef.current = true;
    stopMicrophoneMeter();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setStatus('Finishing… / 正在完成识别…');
    }
  };

  const toggleListening = () => {
    if (isHoldingMic) stopSpeaking();
    else void startSpeaking();
  };

  const resetNature = () => {
    pressActiveRef.current = false;
    finishRequestedRef.current = true;
    ignoreRecognitionEndRef.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    stopMicrophoneMeter();
    window.speechSynthesis?.cancel();
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    if (sequenceTimeoutRef.current !== null) window.clearTimeout(sequenceTimeoutRef.current);
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    sequenceTimeoutRef.current = null;
    toastTimeoutRef.current = null;
    setIsHoldingMic(false);
    setActiveWord(null);
    setStars(0);
    setFlowStep('single-word');
    setShowVolumeToast(false);
    botLiveRef.current = false;
    botRecognitionRef.current?.stop();
    setShowChatDialog(false);
    setChatMessages([]);
    setIsBotLive(false);
    setIsBotListening(false);
    setIsReplySpeaking(false);
    setStarBurst(false);
    setShowBotHint(false);
    setStatus('Fresh garden! Say one word to begin. / 花园重新开始！先说一个单词。');
    setAction((current) => ({ word: null, id: current.id + 1, strength: 0 }));
  };

  const speechWindow = typeof window === 'undefined' ? undefined : window as Window & {
    SpeechRecognition?: SpeechConstructor;
    webkitSpeechRecognition?: SpeechConstructor;
  };
  const speechSupported = Boolean(speechWindow?.SpeechRecognition || speechWindow?.webkitSpeechRecognition);

  const words: Array<{
    word: NatureWord;
    pronunciation: string;
    meaning: string;
    prompt: string;
  }> = [
    { word: 'wind', pronunciation: '/wɪnd/', meaning: '风', prompt: 'A breeze is moving through the garden.' },
    { word: 'blow', pronunciation: '/bloʊ/', meaning: '吹', prompt: 'Blow the clouds and tree!' },
  ];

  return (
    <main className="story-shell text-foreground">
      <Dialog open={showVolumeGuide} onOpenChange={setShowVolumeGuide}>
        <DialogContent className="max-w-md rounded-[24px] border-2 border-border bg-card p-7 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-[-.04em]">
              Try different voices!<br />试试不同的音量！
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm font-semibold leading-relaxed">
              Tap the microphone and say one word first. Then tap again and say “wind blow”. Whisper, speak normally, or use a big voice to change the gust.
              <br />
              <span className="mt-2 block">点击麦克风先说一个单词，再次点击后说 wind blow。试试小声、平常音量和大声说，看看风会有什么变化。</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 rounded-[16px] bg-muted p-4 text-sm font-bold">
            <p>🤫 Quiet / 小声 — a tiny breeze / 微风轻轻吹</p>
            <p>🙂 Medium / 中等 — leaves sway, clouds drift / 树叶摇动，云朵飘动</p>
            <p>🌬️ Loud / 大声 — leaves and clouds fly away / 树叶和云都被吹走</p>
          </div>
          <button
            type="button"
            onClick={() => setShowVolumeGuide(false)}
            className="min-h-11 rounded-full bg-primary px-5 font-black text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Let’s try! / 开始试试
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={showVolumeToast} onOpenChange={setShowVolumeToast}>
        <DialogContent className="max-w-sm rounded-[22px] border-2 border-secondary bg-card p-6 text-center">
          <DialogTitle className="text-xl font-black tracking-[-.03em]">
            Try different volumes!<br />试试不同音量！
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm font-semibold leading-relaxed">
            Now say the full phrase “wind blow”.<br />现在说完整短语 “wind blow”。
          </DialogDescription>
        </DialogContent>
      </Dialog>
      <Dialog open={showChatDialog} onOpenChange={(open) => {
        setShowChatDialog(open);
        if (!open && isBotLive) toggleBotChat();
      }}>
        <DialogContent className="max-w-md rounded-[24px] border-2 border-secondary bg-card p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black tracking-[-.04em]">
              <Bot className="text-secondary" /> Garden Buddy
            </DialogTitle>
            <DialogDescription>
              Talk with the garden robot in English or Chinese. / 用中文或英文和花园机器人聊天。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-[18px] bg-muted p-3" aria-live="polite">
            {chatMessages.map((message, index) => (
              <p key={`${message.role}-${index}`} className={`rounded-[14px] p-3 text-sm font-bold leading-relaxed ${message.role === 'bot' ? 'mr-6 bg-card' : 'ml-6 bg-secondary/20'}`}>
                {message.text}
              </p>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-muted-foreground">
              {isBotListening ? 'Listening… / 正在听…' : isReplySpeaking ? 'Buddy is speaking… / 机器人正在说话…' : 'Tap the phone to talk. / 点击电话开始说话。'}
            </span>
            <button
              type="button"
              onClick={toggleBotChat}
              className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-white transition-transform hover:scale-105 ${isBotLive ? 'bg-destructive' : 'bg-secondary'}`}
              aria-label={isBotLive ? 'End garden buddy chat' : 'Start garden buddy chat'}
            >
              {isBotLive ? <PhoneOff size={23} /> : <Phone size={23} />}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="mx-auto flex min-h-[100dvh] max-w-[1320px] flex-col px-4 pb-8 sm:px-7 lg:px-10">
        <header className="flex items-center justify-between py-5 sm:py-7">
          <Link href="/" className="flex min-h-11 items-center gap-2 rounded-full border-2 border-border bg-card px-4 text-sm font-extrabold transition-transform hover:-translate-y-0.5">
            <ArrowRight className="rotate-180" size={16} /> Chapters
          </Link>
          <div className="flex items-center gap-3" data-testid="brand-moving-nature">
            <div className="grid h-11 w-11 rotate-[-5deg] place-items-center rounded-[14px] bg-secondary text-secondary-foreground soft-shadow">
              <Leaf size={23} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[17px] font-black leading-none tracking-[-.03em]">Moving Nature</p>
              <p className="mono-label mt-1 text-muted-foreground">chapter 02 · listen & move</p>
            </div>
          </div>
          <div className="w-11" aria-hidden="true" />
        </header>

        <section className="mb-6">
          <p className="mono-label mb-2 text-primary">target language / wind & action</p>
          <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-black leading-[.92] tracking-[-.075em]">
            Can you make<br /><span className="text-secondary">the garden blow?</span>
          </h1>
          <p className="mt-4 max-w-[620px] text-base font-semibold leading-relaxed text-muted-foreground">
            Tap each word to hear how it sounds. Then watch what happens when the wind begins to blow.
          </p>
        </section>

        <section className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.75fr)] lg:items-stretch">
          <div className="paper-shadow canvas-grid relative flex min-h-[320px] overflow-hidden rounded-[28px] bg-card p-2 sm:min-h-[430px] sm:p-3">
            <NatureCanvas action={action} />
            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 text-[11px] font-extrabold text-secondary scribble-border backdrop-blur-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-secondary" /> living garden
            </div>
            <div className="absolute right-5 top-5">
              <div className="flex items-center gap-1 rounded-full bg-card/90 px-3 py-1.5 text-[11px] font-extrabold text-primary scribble-border backdrop-blur-sm" aria-label={`${stars} stars earned`} data-testid="text-nature-stars">
                <Sparkles size={14} /> {stars}
              </div>
            </div>
            {starBurst && (
              <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center" aria-label="Star reward" data-testid="nature-star-reward">
                <div className="animate-bounce text-7xl drop-shadow-[0_6px_0_rgba(0,0,0,.15)]">⭐</div>
              </div>
            )}
            {activeWord && (
              <div className="absolute right-5 top-14 rounded-full bg-card/90 px-3 py-1.5 text-[11px] font-extrabold text-primary scribble-border backdrop-blur-sm" data-testid="text-wind-strength">
                {action.strength < 0.4 ? 'soft breeze / 微风' : action.strength < 0.85 ? 'breezy / 轻风' : 'strong gust / 大风'}
              </div>
            )}
            <div className="absolute bottom-5 left-5 right-5 flex items-center gap-2 rounded-[14px] bg-card/90 px-3 py-2 text-xs font-bold leading-snug scribble-border backdrop-blur-sm sm:right-auto sm:max-w-[340px]">
              {activeWord === 'blow' ? <Cloud size={16} className="shrink-0 text-secondary" /> : <Wind size={16} className="shrink-0 text-secondary" />}
              <span>{activeWord ? words.find(({ word }) => word === activeWord)?.prompt : 'Choose a word and watch the garden respond.'}</span>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <button
              type="button"
              onClick={resetNature}
              data-testid="button-reset-moving-nature"
              className="flex min-h-14 items-center justify-center gap-2 rounded-[20px] border-2 border-border bg-card px-5 text-base font-black transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <RotateCcw size={19} /> Start Over / 重新开始
            </button>
            <div className="rounded-[24px] bg-sidebar p-5 text-sidebar-foreground soft-shadow sm:p-6">
              <p className="mono-label text-sidebar-primary">target language</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-.04em]">Listen. Then make it move.</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-sidebar-foreground/70">
                Tap a word to hear its pronunciation and see it come to life.
              </p>
            </div>
            <div className="relative flex gap-3">
              <button
                type="button"
                onClick={toggleListening}
                onKeyDown={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') event.preventDefault();
                }}
                aria-label={isHoldingMic ? 'Listening. Tap again when you finish speaking.' : 'Tap to say wind or blow'}
                aria-pressed={isHoldingMic}
                data-testid="button-toggle-listening-nature"
                className={`flex min-h-[78px] min-w-0 flex-1 touch-none items-center justify-between rounded-[20px] px-5 text-left text-base font-black text-sidebar-primary-foreground transition-transform active:scale-[.99] ${isHoldingMic ? 'bg-primary listen-ring' : 'bg-secondary hover:-translate-y-0.5'}`}
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-white/20">
                    {isHoldingMic ? <Waves size={22} /> : <Mic size={22} />}
                  </span>
                  <span>
                    <span className="block">{isHoldingMic ? 'Listening… / 正在听…' : 'Tap to listen / 点击开始听'}</span>
                    <span className="mt-1 block text-xs font-bold opacity-80">{flowStep === 'single-word' ? 'Say one word / 说一个单词' : 'Say “wind blow” / 说 wind blow'}</span>
                  </span>
                </span>
                {isHoldingMic ? <MicOff size={20} /> : <Volume2 size={20} />}
              </button>
              <button
                type="button"
                onClick={toggleBotChat}
                data-testid="button-garden-buddy"
                aria-label="Talk with Garden Buddy"
                className={`relative grid min-h-[78px] w-[82px] shrink-0 place-items-center rounded-[20px] border-2 border-secondary bg-card text-secondary transition-transform hover:-translate-y-0.5 ${showBotHint ? 'animate-bounce' : ''}`}
              >
                <Bot size={31} />
                <span className="absolute -bottom-1 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-black text-secondary-foreground">AI</span>
              </button>
              {showBotHint && (
                <div className="pointer-events-none absolute -right-2 -top-16 flex flex-col items-center text-center text-xs font-black text-primary">
                  <span className="rounded-full bg-card px-3 py-1.5 shadow-md">Talk to me!<br />来和我聊天吧！</span>
                  <ArrowDown size={22} />
                </div>
              )}
            </div>
            {!speechSupported && (
              <p className="text-xs font-semibold leading-relaxed text-muted-foreground" role="status">
                Voice recognition is unavailable; tap either word card instead. / 暂不支持语音识别，请点击下方单词卡。
              </p>
            )}
            {words.map(({ word, pronunciation, meaning, prompt }) => {
              const isBlow = word === 'blow';
              const selected = activeWord === word;
              return (
                <button
                  key={word}
                  type="button"
                  onClick={() => void activateWord(word)}
                  aria-pressed={selected}
                  data-testid={`button-nature-${word}`}
                  className={`group relative flex min-h-[132px] flex-1 flex-col justify-between overflow-hidden rounded-[24px] border-2 p-5 text-left transition-[transform,background-color,border-color] hover:-translate-y-1 active:translate-y-0 sm:p-6 ${selected ? 'border-secondary bg-secondary/10' : 'border-border bg-card'}`}
                >
                  <span className={`absolute -right-4 -top-5 h-24 w-24 rounded-full ${isBlow ? 'bg-primary/10' : 'bg-secondary/10'}`} />
                  <span className="relative flex w-full items-start justify-between">
                    <span>
                      <span className="block text-[clamp(2rem,5vw,3.25rem)] font-black leading-none tracking-[-.07em]">{word}</span>
                      <span className="mt-2 block font-mono text-sm font-bold text-muted-foreground">{pronunciation} <span className="mx-1">·</span> {meaning}</span>
                    </span>
                    <span className={`grid h-12 w-12 place-items-center rounded-full ${isBlow ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                      {isBlow ? <Cloud size={23} /> : <Wind size={23} />}
                    </span>
                  </span>
                  <span className="relative mt-4 flex items-center justify-between gap-3 text-xs font-bold text-muted-foreground">
                    <span>{prompt}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-secondary"><Volume2 size={15} /> listen</span>
                  </span>
                </button>
              );
            })}
            <p className="min-h-10 px-1 text-xs font-bold leading-relaxed text-muted-foreground" role="status" aria-live="polite" data-testid="status-moving-nature">
              {status}
            </p>
          </aside>
        </section>

        <footer className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5 text-xs font-semibold text-muted-foreground">
          <p className="flex items-center gap-2"><Headphones size={14} /> Listen to each word, then try saying it aloud.</p>
          <p className="flex items-center gap-2"><Info size={14} /> Tap the mic or tap a word / 点击麦克风或单词</p>
        </footer>
      </div>
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
            <section className="mb-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
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
