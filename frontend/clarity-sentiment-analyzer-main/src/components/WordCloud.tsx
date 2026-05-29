import { useEffect, useRef, useState } from "react";
// @ts-ignore - wordcloud package does not ship complete TypeScript definitions.
import WordCloud from "wordcloud";

interface WordData {
  text: string;
  size: number;
}

interface WordCloudComponentProps {
  words: WordData[];
  width?: number;
  height?: number;
  onRenderStats?: (stats: { drawn: number; total: number }) => void;
  onWordClick?: (word: string) => void;
}

export const WordCloudComponent = ({
  words,
  width = 800,
  height = 400,
  onRenderStats,
  onWordClick,
}: WordCloudComponentProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredWord, setHoveredWord] = useState<{
    text: string;
    size: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!canvasRef.current || words.length === 0) {
      onRenderStats?.({ drawn: 0, total: words.length });
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    setHoveredWord(null);
    onRenderStats?.({ drawn: 0, total: words.length });

    let drawnCount = 0;
    const handleDrawn = ((event: CustomEvent<{ drawn: boolean }>) => {
      if (event.detail?.drawn) {
        drawnCount += 1;
      }
    }) as EventListener;
    const handleStop = (() => {
      onRenderStats?.({ drawn: drawnCount, total: words.length });
    }) as EventListener;

    canvas.addEventListener("wordclouddrawn", handleDrawn);
    canvas.addEventListener("wordcloudstop", handleStop);

    const wordList: [string, number][] = words.map((word) => [word.text, word.size]);
    const maxFreq = Math.max(...words.map((word) => word.size));
    const minFreq = Math.min(...words.map((word) => word.size));
    const minFontPx = Math.max(10, Math.round(width * 0.018));
    const maxFontPx = Math.max(minFontPx + 10, Math.round(width * 0.078));

    const root = getComputedStyle(document.documentElement);
    const paletteColors = [
      "--primary",
      "--analytics-blue",
      "--analytics-green",
      "--analytics-orange",
      "--sentiment-positive",
      "--sentiment-negative",
      "--sentiment-neutral",
    ]
      .map((name) => root.getPropertyValue(name).trim())
      .filter(Boolean)
      .map((value) => `hsl(${value})`);

    const options = {
      list: wordList,
      gridSize: Math.max(8, Math.round((12 * width) / 1024)),
      weightFactor: (size: number) => {
        if (maxFreq === minFreq) return Math.round((minFontPx + maxFontPx) / 2);
        const logMin = Math.log(minFreq + 1);
        const logMax = Math.log(maxFreq + 1);
        const logVal = Math.log(size + 1);
        const ratio = (logVal - logMin) / (logMax - logMin);
        return Math.round(minFontPx + ratio * (maxFontPx - minFontPx));
      },
      fontFamily: "Inter, sans-serif",
      color: () => {
        if (paletteColors.length === 0) return "hsl(215 16% 47%)";
        return paletteColors[Math.floor(Math.random() * paletteColors.length)];
      },
      hover: (item: [string, number] | undefined, _dimension: unknown, event: MouseEvent) => {
        canvas.style.cursor = item ? "pointer" : "default";
        if (!item) {
          setHoveredWord(null);
          return;
        }

        setHoveredWord((current) => {
          if (
            current?.text === item[0] &&
            current.size === item[1] &&
            Math.abs(current.x - event.offsetX) < 4 &&
            Math.abs(current.y - event.offsetY) < 4
          ) {
            return current;
          }
          return {
            text: item[0],
            size: item[1],
            x: event.offsetX,
            y: event.offsetY,
          };
        });
      },
      click: (item: [string, number] | undefined) => {
        if (item) onWordClick?.(item[0]);
      },
      rotateRatio: 0.18,
      rotationSteps: 2,
      backgroundColor: "transparent",
      drawOutOfBound: false,
      shrinkToFit: true,
      minSize: minFontPx,
      ellipticity: 0.75,
    };

    try {
      WordCloud(canvas, options);
    } catch (error) {
      console.error("Word cloud generation failed:", error);
      onRenderStats?.({ drawn: 0, total: words.length });
      ctx.font = "16px Inter, sans-serif";
      ctx.fillStyle = "hsl(var(--primary))";
      ctx.textAlign = "center";
      ctx.fillText("Word cloud generation failed", width / 2, height / 2);
      ctx.fillText(`Showing ${words.length} unique words`, width / 2, height / 2 + 24);
    }

    return () => {
      canvas.removeEventListener("wordclouddrawn", handleDrawn);
      canvas.removeEventListener("wordcloudstop", handleStop);
      canvas.style.cursor = "default";
      WordCloud.stop();
    };
  }, [words, width, height, onRenderStats, onWordClick]);

  if (words.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground"
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="text-lg font-medium">No words to display</div>
          <div className="text-sm">Add comments to generate a word cloud</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center">
      <div className="relative inline-block">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          aria-label="Interactive keyword word cloud"
          title="Select a word to inspect matching comments"
          className="h-auto max-w-full rounded-lg border border-border bg-card"
          style={{
            maxWidth: "100%",
            height: "auto",
            aspectRatio: `${width} / ${height}`,
          }}
          onMouseLeave={() => setHoveredWord(null)}
        />
        {hoveredWord && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
            style={{
              left: `min(${hoveredWord.x + 12}px, calc(100% - 140px))`,
              top: `min(${hoveredWord.y + 12}px, calc(100% - 48px))`,
            }}
          >
            <div className="font-semibold text-foreground">{hoveredWord.text}</div>
            <div className="font-mono text-[11px] text-muted-foreground">weight {hoveredWord.size}</div>
          </div>
        )}
        <div className="absolute bottom-2 right-2 rounded border border-border bg-card/90 px-2 py-1 text-xs text-muted-foreground">
          {words.length} unique words
        </div>
      </div>
    </div>
  );
};
