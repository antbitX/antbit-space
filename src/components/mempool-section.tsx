import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Boxes } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import {
  blockSubsidySats,
  fetchBlockTxs,
  fetchMempoolStats,
  fetchProjectedBlocks,
  fetchRecentBlocks,
  formatBtcFromSats,
  formatClock,
  formatMinedAgo,
  formatSizeMb,
  squarify,
  type BlockTx,
  type CoinbaseInfo,
  type MempoolStats,
  type ProjectedBlock,
  type RecentBlock,
} from "@/lib/mempool";

const BLOCK_TAB_COUNT = 5;
const MOSAIC_TXS = 100;

/**
 * If mempool.space changes its API shape, this section degrades to a notice
 * instead of taking the whole page down with it.
 */
class MempoolErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="grid place-items-center rounded-lg bg-bg/70 px-4 py-10 text-sm text-muted">
          Live block data is unavailable right now.
        </p>
      );
    }
    return this.props.children;
  }
}

type Tile = { vsize: number; feeRate: number; title: string };

// Fee-rate → color, log-scaled across the visible tiles. Stops follow the
// site palette: deep blue (low) → accent (mid) → coin gold → red (high).
const COLOR_STOPS: Array<[number, [number, number, number]]> = [
  [0, [36, 70, 138]],
  [0.38, [61, 180, 255]],
  [0.68, [196, 164, 106]],
  [1, [239, 91, 91]],
];

function stopsColor(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  let a = COLOR_STOPS[0]!;
  let b = COLOR_STOPS[COLOR_STOPS.length - 1]!;
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (clamped >= COLOR_STOPS[i]![0] && clamped <= COLOR_STOPS[i + 1]![0]) {
      a = COLOR_STOPS[i]!;
      b = COLOR_STOPS[i + 1]!;
      break;
    }
  }
  const span = b[0] - a[0] || 1;
  const f = (clamped - a[0]) / span;
  const rgb = a[1].map((c, i) => Math.round(c + (b[1][i]! - c) * f));
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(rgb[0]!)}${hex(rgb[1]!)}${hex(rgb[2]!)}`;
}

function rateToT(rate: number, min: number, max: number): number {
  const lo = Math.log10(Math.max(min, 0.01));
  const hi = Math.log10(Math.max(max, 0.02));
  const raw = hi > lo ? (Math.log10(Math.max(rate, 0.01)) - lo) / (hi - lo) : 0.5;
  return Math.min(1, Math.max(0, raw));
}

function feeColor(rate: number, min: number, max: number): string {
  return stopsColor(rateToT(rate, min, max));
}

/**
 * Treemap mosaic: each tile's area is proportional to its transaction's
 * vsize — the "little blocks" that make up the big block.
 */
function Mosaic({
  tiles,
  cycle,
  label,
}: {
  tiles: Tile[];
  cycle: number | string;
  label: string;
}) {
  const rects = useMemo(
    () => squarify(tiles.map((t) => t.vsize), 0, 0, 100, 62.5),
    [tiles],
  );
  const { min, max } = useMemo(() => {
    const rates = tiles.map((t) => t.feeRate);
    return { min: Math.min(...rates, 0.01), max: Math.max(...rates, 0.02) };
  }, [tiles]);

  if (tiles.length === 0) return null;
  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-bg/70"
      role="img"
      aria-label={label}
    >
      {tiles.map((tile, i) => {
        const r = rects[i];
        if (!r) return null;
        return (
          <div
            key={`${cycle}-${i}`}
            className="absolute"
            style={{
              left: `${r.x}%`,
              top: `${(r.y / 62.5) * 100}%`,
              width: `${r.w}%`,
              height: `${(r.h / 62.5) * 100}%`,
            }}
          >
            <div
              className="tile-drop m-[1px] h-[calc(100%-2px)] w-[calc(100%-2px)] rounded-[3px]"
              style={{
                backgroundColor: feeColor(tile.feeRate, min, max),
                animationDelay: `${Math.min(i * 9, 900)}ms`,
              }}
              title={tile.title}
            />
          </div>
        );
      })}
      <div className="pointer-events-none absolute bottom-2 right-3 flex items-center gap-1.5 rounded-full bg-bg/70 px-2.5 py-1 backdrop-blur-sm">
        <span className="text-[10px] font-medium text-muted">low fee</span>
        <span
          className="h-2 w-16 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, rgb(36,70,138), rgb(61,180,255), rgb(196,164,106), rgb(239,91,91))",
          }}
        />
        <span className="text-[10px] font-medium text-muted">high fee</span>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-surface-2/70 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-0.5 truncate font-mono text-sm tabular-nums text-fg" title={value}>
        {value}
      </p>
      {sub ? (
        <p className="truncate text-[11px] text-subtle" title={sub}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function BlockView({ block }: { block: RecentBlock }) {
  const [txs, setTxs] = useState<BlockTx[] | null>(null);
  const [coinbase, setCoinbase] = useState<CoinbaseInfo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let dead = false;
    setTxs(null);
    setError(false);
    fetchBlockTxs(block.hash, MOSAIC_TXS)
      .then(({ txs, coinbase }) => {
        if (dead) return;
        setTxs(txs);
        setCoinbase(coinbase);
      })
      .catch(() => {
        if (!dead) setError(true);
      });
    return () => {
      dead = true;
    };
  }, [block.hash]);

  const tiles: Tile[] = useMemo(
    () =>
      (txs ?? []).map((t) => ({
        vsize: t.vsize,
        feeRate: t.feeRate,
        title: `${t.txid.slice(0, 12)}… · ${t.feeRate.toFixed(1)} sat/vB · ${(t.vsize / 1000).toFixed(1)} kB`,
      })),
    [txs],
  );

  const feesSats =
    coinbase != null ? Math.max(0, coinbase.rewardSats - blockSubsidySats(block.height)) : null;

  return (
    <div className="space-y-4">
      {error ? (
        <div className="grid aspect-[16/10] place-items-center rounded-lg bg-bg/70">
          <div className="text-center">
            <p className="text-sm text-muted">Couldn't load block {formatNumber(block.height)}.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 text-sm font-medium text-accent hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      ) : !txs ? (
        <Skeleton className="aspect-[16/10] w-full rounded-lg" />
      ) : (
        <Mosaic
          tiles={tiles}
          cycle={block.hash}
          label={`Treemap of the first ${tiles.length} transactions in block ${block.height}, sized by transaction weight and colored by fee rate`}
        />
      )}
      {txs && block.txCount > txs.length ? (
        <p className="text-xs text-subtle">
          Showing the first {txs.length} of {formatNumber(block.txCount)} transactions, in block
          order.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Stat label="Block" value={formatNumber(block.height)} />
        <Stat
          label="Mined"
          value={formatMinedAgo(block.timestamp)}
          sub={formatClock(block.timestamp)}
        />
        <Stat label="Size" value={formatSizeMb(block.size)} sub={`${formatNumber(block.weight)} WU`} />
        <Stat label="Transactions" value={formatNumber(block.txCount)} />
        <Stat
          label="Fees"
          value={feesSats != null ? formatBtcFromSats(feesSats) : "—"}
          sub={feesSats != null ? `${formatNumber(feesSats)} sats` : undefined}
        />
        <Stat
          label="Miner"
          value={coinbase?.poolName ?? "…"}
          sub={
            coinbase && coinbase.poolName === "Unknown" && coinbase.poolTag
              ? coinbase.poolTag
              : undefined
          }
        />
        <Stat
          label="Reward"
          value={coinbase ? formatBtcFromSats(coinbase.rewardSats) : "…"}
          sub="subsidy + fees"
        />
      </div>
    </div>
  );
}

/**
 * The "building" visual: a Tetris-like well that stacks the next block.
 * Waiting transactions become blocky pieces sized by vsize and colored by fee
 * rate; they drop in one after another, highest fee first — the way a miner
 * would take them. The cascade replays each time fresh mempool data arrives.
 */
const TETRIS_COLS = 16;
const TETRIS_ROWS = 10;

type TetrisPiece = { x: number; y: number; w: number; h: number; rate: number };

// Split a cell count into blocky rectangle pieces, largest first.
function rectsForCells(cells: number, flip: boolean): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const cands: Array<[number, number]> = [
    [3, 2],
    [2, 3],
    [2, 2],
    [4, 1],
    [1, 4],
    [3, 1],
    [1, 3],
    [2, 1],
    [1, 2],
    [1, 1],
  ];
  let rest = cells;
  while (rest > 0) {
    const pick = cands.find(([w, h]) => w * h <= rest) ?? [1, 1];
    let [w, h] = pick;
    if (flip && w !== h) [w, h] = [h, w];
    out.push([w, h]);
    rest -= w * h;
  }
  return out;
}

// Stack pieces bottom-up, Tetris-style: each piece settles at the lowest
// centered slot it fits in.
function stackPieces(
  chunks: Array<{ w: number; h: number; rate: number }>,
): TetrisPiece[] {
  const heights = new Array<number>(TETRIS_COLS).fill(0);
  const pieces: TetrisPiece[] = [];

  // Place one piece. When requireFlush is set, only positions where the piece
  // sits flat on the stack (no trapped holes) are considered.
  const tryPlace = (ch: { w: number; h: number; rate: number }, requireFlush: boolean): boolean => {
    let bestX = -1;
    let bestY = 0;
    let bestScore = Infinity;
    for (let x = 0; x <= TETRIS_COLS - ch.w; x++) {
      const span = heights.slice(x, x + ch.w);
      const y = Math.max(...span);
      if (y + ch.h > TETRIS_ROWS) continue;
      const holes = span.reduce((a, h) => a + (y - h), 0);
      if (requireFlush && holes > 0) continue;
      const score = y * 100 + holes * 120 + Math.abs(x + ch.w / 2 - TETRIS_COLS / 2);
      if (score < bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }
    if (bestX < 0) return false;
    for (let c = bestX; c < bestX + ch.w; c++) heights[c] = bestY + ch.h;
    pieces.push({ x: bestX, y: bestY, w: ch.w, h: ch.h, rate: ch.rate });
    return true;
  };

  for (const ch of chunks) {
    if (!tryPlace(ch, true)) tryPlace(ch, false);
  }

  if (!chunks.length) return pieces;

  // Gravity pass: settle every piece downward onto the stack, bottom-up, so
  // no holes can remain trapped under bridging pieces.
  const byY = [...pieces].sort((a, b) => a.y - b.y);
  const colTop = new Array<number>(TETRIS_COLS).fill(-1);
  for (const p of byY) {
    let rest = 0;
    for (let c = p.x; c < p.x + p.w; c++) rest = Math.max(rest, colTop[c] + 1);
    p.y = Math.min(p.y, rest);
    for (let c = p.x; c < p.x + p.w; c++) colTop[c] = p.y + p.h - 1;
  }

  // Fill pass: close any interior holes left by bridging pieces, then extend
  // every column to the top for a flat finish. Fillers are 1x1 pieces in the
  // cheapest fee color, standing in for remaining low-fee weight.
  const key = (c: number, r: number) => c + ":" + r;
  const occupied = new Set<string>();
  const mark = (p: TetrisPiece) => {
    for (let c = p.x; c < p.x + p.w; c++)
      for (let r = p.y; r < p.y + p.h; r++) occupied.add(key(c, r));
  };
  pieces.forEach(mark);
  const minRate = Math.min(...chunks.map((c) => c.rate));
  const columnTop = (c: number): number => {
    for (let r = TETRIS_ROWS - 1; r >= 0; r--) if (occupied.has(key(c, r))) return r;
    return -1;
  };
  for (let c = 0; c < TETRIS_COLS; c++) {
    const top = columnTop(c);
    for (let r = 0; r < TETRIS_ROWS; r++) {
      // Interior hole (empty cell with stack above it), or open sky above a
      // short column — either way, complete it with a 1x1 filler.
      if (r > top || !occupied.has(key(c, r))) {
        const f: TetrisPiece = { x: c, y: r, w: 1, h: 1, rate: minRate };
        pieces.push(f);
        mark(f);
      }
    }
  }
  return pieces;
}

function BuildingBlock({
  stats,
  projected,
  cycle,
}: {
  stats: MempoolStats;
  projected: ProjectedBlock | null;
  cycle: number;
}) {
  const pieces = useMemo(() => {
    const histogram = stats.feeHistogram ?? [];
    const total = histogram.reduce((a, [, v]) => a + v, 0);
    if (total <= 0) return [];
    const cellVsize = total / (TETRIS_COLS * TETRIS_ROWS);
    const chunks: Array<{ w: number; h: number; rate: number }> = [];
    // Highest fee first — those pieces land at the bottom, like a miner
    // filling the block with the best-paying transactions first.
    const sorted = [...histogram].sort((a, b) => b[0] - a[0]);
    sorted.forEach(([rate, vsize], bi) => {
      if (vsize <= 0) return;
      const cells = Math.max(1, Math.round(vsize / cellVsize));
      for (const [w, h] of rectsForCells(cells, bi % 2 === 1)) {
        chunks.push({ w, h, rate });
      }
    });
    return stackPieces(chunks);
  }, [stats]);

  const fill = projected ? Math.min(1, projected.blockVSize / 1_000_000) : 0;
  const minRate = pieces.length ? Math.min(...pieces.map((p) => p.rate)) : 0;
  const maxRate = pieces.length ? Math.max(...pieces.map((p) => p.rate)) : 1;

  // Per-row fee gradient: t-weighted average so the high-fee pieces that
  // define each row's character dominate (like the eye reads it), while the
  // continuous interpolation below keeps every boundary seamless.
  const rowT = useMemo(() => {
    const acc = new Array(TETRIS_ROWS).fill(0);
    const wgt = new Array(TETRIS_ROWS).fill(0);
    for (const p of pieces) {
      const t = rateToT(p.rate, minRate, maxRate);
      for (let r = p.y; r < p.y + p.h && r < TETRIS_ROWS; r++) {
        acc[r] += t * t * p.w;
        wgt[r] += t * p.w;
      }
    }
    const out: number[] = [];
    for (let r = 0; r < TETRIS_ROWS; r++) {
      out.push(wgt[r] > 0 ? acc[r] / wgt[r] : 0);
    }
    return out;
  }, [pieces, minRate, maxRate]);

  // Continuous fee level as a function of height (y=0 bottom): linearly
  // interpolates between row centers so piece gradients meet seamlessly.
  const rowTRef = useRef(rowT);
  rowTRef.current = rowT;
  const levelAt = useCallback((y: number): number => {
    const rows = rowTRef.current;
    if (!rows.length) return 0;
    const cy = Math.min(TETRIS_ROWS - 0.501, Math.max(0.5, y));
    const r0 = Math.min(TETRIS_ROWS - 2, Math.max(0, Math.floor(cy - 0.5)));
    const frac = cy - 0.5 - r0;
    const a = rows[r0] ?? 0;
    const b = rows[r0 + 1] ?? a;
    return a + (b - a) * frac;
  }, []);

  return (
    <div className="flex justify-center">
      <div className="flex w-full max-w-[840px] flex-col gap-2">
      <div
        role="img"
        aria-label="Tetris-like animation of transactions stacking into the next block, sized by weight and colored by fee rate"
        className="tetris-well relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#06080c]"
        style={{ aspectRatio: `${TETRIS_COLS} / ${TETRIS_ROWS}` }}
      >
        <div className="tetris-grid absolute inset-0" aria-hidden />

        <div key={cycle} className="absolute inset-0">
          {pieces.map((p, i) => {
            // Each piece carries the slice of one continuous vertical gradient,
            // sampled from a smooth function of height: neighbors share
            // identical boundary colors, so no seams appear anywhere.
            const topT = levelAt(p.y + p.h);
            const bottomT = levelAt(p.y);
            const topPct = ((TETRIS_ROWS - p.y - p.h) / TETRIS_ROWS) * 100;
            const hPct = (p.h / TETRIS_ROWS) * 100;
            return (
              <div
                key={i}
                className="tetris-piece absolute"
                style={{
                  left: `${(p.x / TETRIS_COLS) * 100}%`,
                  top: `${topPct}%`,
                  width: `calc(${(p.w / TETRIS_COLS) * 100}% + 1px)`,
                  height: `calc(${hPct}% + 1px)`,
                  ["--fall" as string]: `${topPct + hPct + 4}cqh`,
                  animationDelay: `${Math.min(i * 12, 1400)}ms`,
                }}
              >
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(180deg, ${stopsColor(topT)} 0%, ${stopsColor(bottomT)} 100%)`,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
          aria-hidden
          style={{
            opacity: 0.25 + fill * 0.75,
            background:
              "radial-gradient(ellipse 90% 40% at 50% 108%, rgba(247,147,26,0.30), transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 30%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.14) 100%)",
          }}
        />
      </div>

      <div className="w-full">
        <div className="flex items-center justify-between pb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">
          <span>Block {Math.round(fill * 100)}% full</span>
          {projected ? <span>{formatSizeMb(projected.blockVSize)} projected</span> : null}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-orange-500 transition-all duration-1000"
            style={{ width: `${fill * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-white/55">
        <span>low fee</span>
        <span
          className="inline-block h-1.5 w-14 rounded-full"
          style={{
            background:
              "linear-gradient(90deg,#1d4ed8,#38bdf8,#fbbf24,#f97316,#ef4444)",
          }}
        />
        <span>high fee</span>
      </div>
      </div>
    </div>
  );
}

function NextBlockView() {
  const [proj, setProj] = useState<ProjectedBlock | null>(null);
  const [stats, setStats] = useState<MempoolStats | null>(null);
  const [cycle, setCycle] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let dead = false;
    const load = () => {
      if (document.hidden) return;
      Promise.all([fetchProjectedBlocks(), fetchMempoolStats()])
        .then(([p, s]) => {
          if (dead) return;
          setProj(p[0] ?? null);
          setStats(s);
          setError(false);
          setCycle((c) => c + 1);
        })
        .catch(() => {
          if (!dead) setError(true);
        });
    };
    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      dead = true;
      window.clearInterval(id);
    };
  }, []);

  const next = proj;
  const feeRange = next?.feeRange ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-up" />
        </span>
        <p className="text-sm font-medium text-fg">
          Building the next block
          {stats ? (
            <span className="ml-2 font-normal text-muted">
              {formatNumber(stats.count)} transactions waiting
            </span>
          ) : null}
        </p>
      </div>

      {error && !stats ? (
        <div className="grid aspect-[16/10] place-items-center rounded-lg bg-bg/70">
          <p className="text-sm text-muted">Couldn't reach mempool.space. Retrying…</p>
        </div>
      ) : !stats ? (
        <Skeleton className="aspect-[16/10] w-full rounded-lg" />
      ) : (
        <BuildingBlock stats={stats} projected={proj} cycle={cycle} />
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Projected txs"
          value={next ? `≈${formatNumber(next.nTx)}` : "…"}
          sub={stats ? `${formatNumber(stats.count)} waiting` : undefined}
        />
        <Stat
          label="Projected size"
          value={next ? formatSizeMb(next.blockVSize) : "…"}
          sub="vsize"
        />
        <Stat
          label="Projected fees"
          value={next ? formatBtcFromSats(next.totalFees) : "…"}
          sub={next ? `${formatNumber(next.totalFees)} sats` : undefined}
        />
        <Stat
          label="Fee range"
          value={
            feeRange.length > 1
              ? `${feeRange[0]!.toFixed(1)}–${feeRange[feeRange.length - 1]!.toFixed(0)}`
              : "…"
          }
          sub="sat/vB"
        />
      </div>
    </div>
  );
}

export function MempoolSection() {
  const [blocks, setBlocks] = useState<RecentBlock[] | null>(null);
  const [tab, setTab] = useState("next");

  useEffect(() => {
    let dead = false;
    const load = () => {
      fetchRecentBlocks(BLOCK_TAB_COUNT + 1)
        .then((next) => {
          if (!dead) setBlocks(next);
        })
        .catch(() => {
          /* keep previous list; section shows its own error state */
        });
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      dead = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <section id="mempool" className="scroll-mt-24 space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Mempool</p>
          <h2 className="mt-1 font-display text-2xl text-fg">Live blocks</h2>
        </div>
        <a
          href="https://mempool.space"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-xs text-muted transition-colors hover:text-fg"
        >
          <Boxes className="size-3.5 text-accent" />
          mempool.space
        </a>
      </div>

      <Card className="bg-surface/90">
        <CardContent className="space-y-4">
          <MempoolErrorBoundary>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className={cn("max-w-full flex-wrap overflow-x-auto")}>
              <TabsTrigger value="next" className="font-mono">
                <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-up" />
                Building
              </TabsTrigger>
              {(blocks ?? []).map((b) => (
                <TabsTrigger key={b.hash} value={b.hash} className="font-mono tabular-nums">
                  {formatNumber(b.height)}
                </TabsTrigger>
              ))}
              {!blocks
                ? Array.from({ length: BLOCK_TAB_COUNT }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-20 rounded-md" />
                  ))
                : null}
            </TabsList>
            <TabsContent value="next">
              <NextBlockView />
            </TabsContent>
            {(blocks ?? []).map((b) => (
              <TabsContent key={b.hash} value={b.hash}>
                <BlockView block={b} />
              </TabsContent>
            ))}
          </Tabs>
          </MempoolErrorBoundary>
        </CardContent>
      </Card>
    </section>
  );
}
