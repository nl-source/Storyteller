/**
 * First-run hints: on a child's first visits, every control on the page gets a
 * bubble that says what it does. A bubble fades away for good as soon as that
 * control has been used once. When every control has been tried (or after three
 * visits, or after "Got it"), the hints shrink to a small "?" button.
 *
 * Mark a control with `data-hint="<key>"`. Several elements may share a key
 * (e.g. all picture cards = "words"); the bubble points at the first visible one
 * and using any of them counts. Optional `data-hint-en` / `data-hint-zh` override
 * the default text, and `data-hint-side` picks where the bubble sits.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

type Side = 'top' | 'bottom' | 'left' | 'right';
type HintCopy = { en: string; zh: string; side: Side };

const DEFAULT_HINTS: Record<string, HintCopy> = {
  home: { en: 'Home', zh: '回到首页', side: 'bottom' },
  back: { en: 'Go back', zh: '返回上一页', side: 'bottom' },
  next: { en: 'Next scene', zh: '去下一关', side: 'bottom' },
  mic: { en: 'Tap, then talk!', zh: '点我，再说英语', side: 'top' },
  undo: { en: 'Undo', zh: '退一步', side: 'top' },
  clear: { en: 'Clear', zh: '清空画布', side: 'top' },
  words: { en: 'Tap a picture', zh: '点图片，听单词', side: 'top' },
  chapter: { en: 'Tap to play!', zh: '点一下开始玩', side: 'top' },
  window: { en: 'Tap a window', zh: '点一点，有惊喜', side: 'top' },
};

const STORAGE_KEY = 'storyteller.firstRunHints.v1';
const MAX_VISITS = 3;

type Store = { used: string[]; visits: number; done: boolean };

function readStore(): Store {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Store>;
      return { used: parsed.used ?? [], visits: parsed.visits ?? 0, done: Boolean(parsed.done) };
    }
  } catch {
    // Storage blocked (private mode, kiosk): hints simply show for this visit.
  }
  return { used: [], visits: 0, done: false };
}

function writeStore(store: Store) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* ignore */ }
}

// Count each browser tab session once, not every page change inside the app.
let visitCounted = false;

type Placed = { key: string; copy: HintCopy; rect: DOMRect; side: Side };

function chooseSide(preferred: Side, rect: DOMRect): Side {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (preferred === 'top' && rect.top < 84) return 'bottom';
  if (preferred === 'bottom' && rect.bottom > vh - 84) return 'top';
  if (preferred === 'left' && rect.left < 180) return rect.top > 84 ? 'top' : 'bottom';
  if (preferred === 'right' && rect.right > vw - 180) return rect.top > 84 ? 'top' : 'bottom';
  return preferred;
}

function isVisible(element: Element) {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
}

export function FirstRunHints() {
  const [store, setStore] = useState<Store>(() => readStore());
  const [leaving, setLeaving] = useState<string[]>([]);
  const [replay, setReplay] = useState(false);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const frameRef = useRef<number | null>(null);

  // A new visit: count it, and minimise for good after a few visits.
  useEffect(() => {
    if (visitCounted) return;
    visitCounted = true;
    setStore((current) => {
      const next = { ...current, visits: current.visits + 1, done: current.done || current.visits + 1 > MAX_VISITS };
      writeStore(next);
      return next;
    });
  }, []);

  const showing = replay || !store.done;
  const hiddenKeys = new Set(replay ? [] : store.used);

  const markUsed = useCallback((key: string) => {
    setLeaving((current) => (current.includes(key) ? current : [...current, key]));
    window.setTimeout(() => {
      setLeaving((current) => current.filter((item) => item !== key));
      setStore((current) => {
        if (current.used.includes(key)) return current;
        const used = [...current.used, key];
        const everyKnownKeyUsed = Object.keys(DEFAULT_HINTS).every((hintKey) => used.includes(hintKey));
        const next = { ...current, used, done: current.done || everyKnownKeyUsed };
        writeStore(next);
        return next;
      });
    }, 450);
  }, []);

  // Using a control (pointer or keyboard) retires its hint.
  useEffect(() => {
    if (!showing) return;
    const onUse = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
      const target = (event.target as Element | null)?.closest?.('[data-hint]');
      const key = target?.getAttribute('data-hint');
      if (!key) return;
      if (replay) setReplay(false);
      else markUsed(key);
    };
    document.addEventListener('pointerdown', onUse, true);
    document.addEventListener('keydown', onUse, true);
    return () => {
      document.removeEventListener('pointerdown', onUse, true);
      document.removeEventListener('keydown', onUse, true);
    };
  }, [showing, replay, markUsed]);

  // Follow the controls as the page lays out, scrolls and resizes.
  const measure = useCallback(() => {
    if (!showing) { setPlaced([]); return; }
    const seen = new Set<string>();
    const next: Placed[] = [];
    document.querySelectorAll<HTMLElement>('[data-hint]').forEach((element) => {
      const key = element.dataset.hint ?? '';
      if (!key || seen.has(key) || hiddenKeys.has(key) || !isVisible(element)) return;
      seen.add(key);
      const base = DEFAULT_HINTS[key] ?? { en: key, zh: '', side: 'top' as Side };
      const copy: HintCopy = {
        en: element.dataset.hintEn ?? base.en,
        zh: element.dataset.hintZh ?? base.zh,
        side: (element.dataset.hintSide as Side | undefined) ?? base.side,
      };
      const rect = element.getBoundingClientRect();
      next.push({ key, copy, rect, side: chooseSide(copy.side, rect) });
    });
    setPlaced((current) => {
      const same = current.length === next.length && current.every((item, index) => {
        const other = next[index];
        return item.key === other.key && item.side === other.side
          && Math.round(item.rect.left) === Math.round(other.rect.left) && Math.round(item.rect.top) === Math.round(other.rect.top)
          && Math.round(item.rect.width) === Math.round(other.rect.width) && Math.round(item.rect.height) === Math.round(other.rect.height);
      });
      return same ? current : next;
    });
    // hiddenKeys is derived from store/replay, which are listed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showing, replay, store.used]);

  useLayoutEffect(() => {
    measure();
    if (!showing) return;
    const schedule = () => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => { frameRef.current = null; measure(); });
    };
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    // Ignore changes inside the hint layer itself, or it would keep re-measuring.
    const observer = new MutationObserver((records) => {
      if (records.some((record) => !(record.target as Element).closest?.('.hint-layer'))) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    // Late layout (fonts, canvases) settles in the first seconds.
    const settle = window.setInterval(schedule, 500);
    return () => {
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      observer.disconnect();
      window.clearInterval(settle);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [measure, showing]);

  const dismissAll = () => {
    setReplay(false);
    setStore((current) => {
      const next = { ...current, done: true };
      writeStore(next);
      return next;
    });
  };

  if (!showing) {
    return (
      <button
        type="button"
        onClick={() => setReplay(true)}
        className="hint-help toy-button toy-white"
        aria-label="Show the hints again"
        data-testid="button-show-hints"
      >
        ?
      </button>
    );
  }

  return (
    <div className="hint-layer" aria-live="polite" data-testid="first-run-hints">
      {placed.map(({ key, copy, rect, side }) => {
        const gap = 14;
        const vw = window.innerWidth;
        const centerX = rect.left + rect.width / 2;
        const vertical = side === 'top' || side === 'bottom';
        // Near a screen edge, the bubble starts (or ends) at the control instead of centring on it.
        const align = !vertical ? 'center' : centerX < 96 ? 'start' : centerX > vw - 96 ? 'end' : 'center';
        const anchorX = align === 'start' ? Math.max(8, rect.left - 4) : align === 'end' ? Math.min(vw - 8, rect.right + 4) : centerX;
        const style: CSSProperties = side === 'top'
          ? { left: anchorX, top: rect.top - gap }
          : side === 'bottom'
            ? { left: anchorX, top: rect.bottom + gap }
            : side === 'left'
              ? { left: rect.left - gap, top: rect.top + rect.height / 2 }
              : { left: rect.right + gap, top: rect.top + rect.height / 2 };
        const arrowX = vertical ? centerX - anchorX : 0;
        return (
          <div key={key} className={`hint-item ${leaving.includes(key) ? 'is-leaving' : ''}`} data-testid={`hint-${key}`}>
            <span
              className="hint-ring"
              style={{
                left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12,
                // Round controls get a round ring; cards get a rounded rectangle.
                borderRadius: Math.abs(rect.width - rect.height) < 8 ? 9999 : 28,
              }}
              aria-hidden="true"
            />
            <div className={`hint-bubble hint-${side} hint-align-${align}`} style={{ ...style, ['--arrow-x' as string]: `${arrowX}px` }} role="note">
              <span className="hint-en">{copy.en}</span>
              {copy.zh && <span className="hint-zh">{copy.zh}</span>}
            </div>
          </div>
        );
      })}
      {placed.length > 0 && (
        <button type="button" className="hint-dismiss toy-button toy-white" onClick={dismissAll} data-testid="button-dismiss-hints">
          Got it · 知道了
        </button>
      )}
    </div>
  );
}
