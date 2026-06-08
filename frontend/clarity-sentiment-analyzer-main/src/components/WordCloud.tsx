import { useEffect, useRef, useState } from "react";

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

interface WordPlacement extends WordData {
  x: number;
  y: number;
  width: number;
  height: number;
  displayText: string;
  color: string;
  fontSize: number;
  rotation: number;
  weight: number;
}

const intersects = (a: WordPlacement, b: WordPlacement) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const drawClassicWordCloud = (
  ctx: CanvasRenderingContext2D,
  words: WordData[],
  width: number,
  height: number,
  colors: string[],
  minFontPx: number,
  maxFontPx: number,
) => {
  const maxFreq = Math.max(...words.map((word) => word.size));
  const minFreq = Math.min(...words.map((word) => word.size));
  const centerX = width / 2;
  const centerY = height / 2;
  const cloudRadiusX = width * 0.49;
  const cloudRadiusY = height * 0.47;
  const placements: WordPlacement[] = [];
  const palette = colors.length
    ? colors
    : [
        "hsl(195 66% 30%)",
        "hsl(197 58% 38%)",
        "hsl(199 52% 46%)",
        "hsl(203 45% 54%)",
        "hsl(207 38% 42%)",
      ];

  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  words.forEach((word, index) => {
    const ratio =
      maxFreq === minFreq
        ? 0.5
        : (Math.log(word.size + 1) - Math.log(minFreq + 1)) /
          (Math.log(maxFreq + 1) - Math.log(minFreq + 1));
    const baseFontSize = Math.round(minFontPx + Math.pow(ratio, 1.32) * (maxFontPx - minFontPx));
    const displayText = word.text.toUpperCase();
    const isVertical = index > 10 && index % 14 === 0;
    const rotation = isVertical ? -Math.PI / 2 : index > 10 && index % 13 === 0 ? Math.PI / 2 : 0;
    const weight = index < 10 ? 800 : index < 30 ? 700 : 600;
    const color = palette[index % palette.length];
    const attempts = [
      { fontSize: baseFontSize, rotation },
      { fontSize: Math.max(minFontPx, Math.round(baseFontSize * 0.82)), rotation: 0 },
      { fontSize: Math.max(Math.round(minFontPx * 0.82), Math.round(baseFontSize * 0.64)), rotation: 0 },
    ];
    let placement: WordPlacement | null = null;

    for (const attempt of attempts) {
      let fontSize = attempt.fontSize;

      ctx.font = `${weight} ${fontSize}px Inter, Arial, sans-serif`;
      let textWidth = ctx.measureText(displayText).width;
      while (textWidth > width * 0.5 && fontSize > minFontPx) {
        fontSize -= 1;
        ctx.font = `${weight} ${fontSize}px Inter, Arial, sans-serif`;
        textWidth = ctx.measureText(displayText).width;
      }

      const boxWidth = attempt.rotation === 0 ? textWidth + 3 : fontSize + 3;
      const boxHeight = attempt.rotation === 0 ? fontSize + 3 : textWidth + 3;

      for (let step = 0; step < 2600; step += 1) {
        const theta = step * 0.29;
        const radius = 1.95 * theta;
        const candidateX = centerX + Math.cos(theta) * radius * 1.42;
        const candidateY = centerY + Math.sin(theta) * radius * 0.82;
        const normalized =
          Math.pow((candidateX - centerX) / cloudRadiusX, 2) +
          Math.pow((candidateY - centerY) / cloudRadiusY, 2);
        const candidate = {
          text: word.text,
          displayText,
          size: word.size,
          color,
          fontSize,
          rotation: attempt.rotation,
          weight,
          x: candidateX - boxWidth / 2,
          y: candidateY - boxHeight / 2,
          width: boxWidth,
          height: boxHeight,
        };

        if (
          normalized <= 1.08 &&
          candidate.x >= 3 &&
          candidate.y >= 3 &&
          candidate.x + candidate.width <= width - 3 &&
          candidate.y + candidate.height <= height - 3 &&
          !placements.some((existing) => intersects(candidate, existing))
        ) {
          placement = candidate;
          break;
        }
      }

      if (placement) break;
    }

    if (!placement) return;

    placements.push(placement);
  });

  if (placements.length === 0) return placements;

  const bounds = placements.reduce(
    (box, placement) => ({
      minX: Math.min(box.minX, placement.x),
      minY: Math.min(box.minY, placement.y),
      maxX: Math.max(box.maxX, placement.x + placement.width),
      maxY: Math.max(box.maxY, placement.y + placement.height),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
  const boundsWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const boundsHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = Math.min((width * 0.9) / boundsWidth, (height * 0.84) / boundsHeight, 1.36);
  const offsetX = width / 2 - ((bounds.minX + boundsWidth / 2) * scale);
  const offsetY = height / 2 - ((bounds.minY + boundsHeight / 2) * scale);

  ctx.clearRect(0, 0, width, height);
  placements.forEach((placement, index) => {
    placement.x = placement.x * scale + offsetX;
    placement.y = placement.y * scale + offsetY;
    placement.width *= scale;
    placement.height *= scale;
    placement.fontSize *= scale;

    ctx.save();
    ctx.translate(placement.x + placement.width / 2, placement.y + placement.height / 2);
    ctx.rotate(placement.rotation);
    ctx.fillStyle = placement.color;
    ctx.font = `${placement.weight} ${placement.fontSize}px Inter, Arial, sans-serif`;
    if (index < 12) {
      ctx.shadowColor = "rgb(15 23 42 / 0.14)";
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 2;
    }
    ctx.fillText(placement.displayText, 0, 0);
    ctx.restore();
  });

  return placements;
};

export const WordCloudComponent = ({
  words,
  width = 800,
  height = 400,
  onRenderStats,
  onWordClick,
}: WordCloudComponentProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const placementsRef = useRef<WordPlacement[]>([]);
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

    const minFontPx = Math.max(7, Math.round(width * 0.009));
    const maxFontPx = Math.max(minFontPx + 18, Math.round(width * 0.068));

    const root = getComputedStyle(document.documentElement);
    const paletteColors = [
      "195 66% 30%",
      "197 58% 38%",
      "199 52% 46%",
      "203 45% 54%",
      "207 38% 42%",
      "211 32% 48%",
      root.getPropertyValue("--analytics-teal").trim(),
      root.getPropertyValue("--analytics-blue").trim(),
    ].filter(Boolean).map((value) => `hsl(${value})`);

    placementsRef.current = drawClassicWordCloud(ctx, words, width, height, paletteColors, minFontPx, maxFontPx);
    onRenderStats?.({ drawn: placementsRef.current.length, total: words.length });

    return () => {
      canvas.style.cursor = "default";
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
          className="h-auto max-w-full rounded-lg border border-border bg-card shadow-sm"
          style={{
            maxWidth: "100%",
            height: "auto",
            aspectRatio: `${width} / ${height}`,
          }}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const scaleX = width / rect.width;
            const scaleY = height / rect.height;
            const x = (event.clientX - rect.left) * scaleX;
            const y = (event.clientY - rect.top) * scaleY;
            const match = placementsRef.current.find(
              (word) => x >= word.x && x <= word.x + word.width && y >= word.y && y <= word.y + word.height,
            );

            event.currentTarget.style.cursor = match ? "pointer" : "default";
            setHoveredWord(match ? { text: match.text, size: match.size, x: x / scaleX, y: y / scaleY } : null);
          }}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const scaleX = width / rect.width;
            const scaleY = height / rect.height;
            const x = (event.clientX - rect.left) * scaleX;
            const y = (event.clientY - rect.top) * scaleY;
            const match = placementsRef.current.find(
              (word) => x >= word.x && x <= word.x + word.width && y >= word.y && y <= word.y + word.height,
            );

            if (match) onWordClick?.(match.text);
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.cursor = "default";
            setHoveredWord(null);
          }}
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
