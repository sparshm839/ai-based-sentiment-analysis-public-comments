import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FileText,
  Frown,
  MessageSquareText,
  RefreshCw,
  ShieldAlert,
  Smile,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { WordCloudComponent } from "./WordCloud";

interface SentimentResult {
  comment: string;
  sentiment: "positive" | "negative" | "neutral" | "spam";
  confidence: number;
  keywords: string[];
  is_spam?: boolean;
}

interface AnalysisResults {
  jobId: string;
  timestamp: Date;
  results: SentimentResult[];
  totalComments: number;
  uniqueComments: number;
  duplicatesIgnored: number;
  sentimentCounts: {
    positive: number;
    negative: number;
    neutral: number;
    spam: number;
  };
  satisfactionScore: number;
  averageConfidence: number;
  modelUsed: string;
}

interface Props {
  results: AnalysisResults;
  onNewAnalysis: () => void;
}

const CHART_COLORS: Record<SentimentResult["sentiment"], string> = {
  positive: "hsl(151 61% 42%)",
  neutral: "hsl(215 16% 47%)",
  negative: "hsl(350 72% 52%)",
  spam: "hsl(31 92% 45%)",
};

const sentimentLabels: Record<SentimentResult["sentiment"], string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
  spam: "Spam",
};

const SentimentBadge = ({ sentiment }: { sentiment: SentimentResult["sentiment"] }) => (
  <span className={`sentiment-chip sentiment-${sentiment}`}>
    <span />
    {sentimentLabels[sentiment]}
  </span>
);

const ConfidenceMeter = ({
  confidence,
  sentiment,
  className = "",
}: {
  confidence: number;
  sentiment: SentimentResult["sentiment"];
  className?: string;
}) => (
  <div className={`confidence-meter ${className}`.trim()}>
    <span className="font-mono text-xs text-muted-foreground">
      {(confidence * 100).toFixed(1)}% confidence
    </span>
    <div className="confidence-bar">
      <div
        className="confidence-fill"
        style={{
          width: `${(confidence * 100).toFixed(1)}%`,
          background: CHART_COLORS[sentiment],
        }}
      />
    </div>
  </div>
);

const StatCard = ({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ElementType;
}) => (
  <Card className="panel-card">
    <CardContent className="flex items-center justify-between gap-4 p-5">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{label || payload[0].name}</p>
      <p className="text-muted-foreground">
        Count: <span className="font-semibold text-foreground">{payload[0].value}</span>
      </p>
    </div>
  );
};

const buildWordCloudData = (source: SentimentResult[]) => {
  const wordFreq: Record<string, number> = {};

  source.forEach((result) => {
    result.keywords.forEach((keyword) => {
      wordFreq[keyword] = (wordFreq[keyword] || 0) + 2;
    });

    result.comment
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .forEach((word) => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
  });

  return Object.entries(wordFreq)
    .map(([text, size]) => ({ text, size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 100);
};

export const ResultsDashboard = ({ results, onNewAnalysis }: Props) => {
  const [wordCloudFilter, setWordCloudFilter] = useState<"all" | SentimentResult["sentiment"]>("all");
  const [wordCloudStats, setWordCloudStats] = useState({ drawn: 0, total: 0 });
  const [showAllWordCloudTerms, setShowAllWordCloudTerms] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<SentimentResult["sentiment"] | null>(null);
  const [visibleDistributionComments, setVisibleDistributionComments] = useState(20);
  const [drilldownDialog, setDrilldownDialog] = useState<{
    title: string;
    description: string;
    comments: SentimentResult[];
  } | null>(null);
  const [visibleDrilldownComments, setVisibleDrilldownComments] = useState(20);
  const [confidenceClassFilter, setConfidenceClassFilter] = useState<"all" | SentimentResult["sentiment"]>("all");

  const totalClassified =
    results.sentimentCounts.positive +
    results.sentimentCounts.neutral +
    results.sentimentCounts.negative +
    results.sentimentCounts.spam;

  const positiveRate = totalClassified
    ? Math.round((results.sentimentCounts.positive / totalClassified) * 100)
    : 0;
  const negativeRate = totalClassified
    ? Math.round((results.sentimentCounts.negative / totalClassified) * 100)
    : 0;
  const scoreColor =
    results.satisfactionScore >= 70
      ? "text-sentiment-positive"
      : results.satisfactionScore >= 45
        ? "text-analytics-orange"
        : "text-sentiment-negative";

  const chartData = [
    { name: "Positive", key: "positive" as const, value: results.sentimentCounts.positive },
    { name: "Neutral", key: "neutral" as const, value: results.sentimentCounts.neutral },
    { name: "Negative", key: "negative" as const, value: results.sentimentCounts.negative },
    { name: "Spam", key: "spam" as const, value: results.sentimentCounts.spam },
  ];
  const pieData = chartData.filter((item) => item.value > 0);

  const openDistributionDialog = (sentiment: SentimentResult["sentiment"]) => {
    setSelectedDistribution(sentiment);
    setVisibleDistributionComments(20);
  };

  const selectedDistributionComments = selectedDistribution
    ? results.results.filter((result) => result.sentiment === selectedDistribution)
    : [];

  const openDrilldownDialog = (title: string, description: string, comments: SentimentResult[]) => {
    setDrilldownDialog({ title, description, comments });
    setVisibleDrilldownComments(20);
  };

  const openConfidenceDrilldown = (
    sentiment: SentimentResult["sentiment"],
    bucket: { label: string; min: number; max: number },
  ) => {
    const comments = results.results.filter(
      (result) =>
        result.sentiment === sentiment &&
        result.confidence >= bucket.min &&
        result.confidence < bucket.max,
    );
    openDrilldownDialog(
      `${sentimentLabels[sentiment]} Confidence: ${bucket.label}`,
      `${comments.length} ${sentimentLabels[sentiment].toLowerCase()} comments in the ${bucket.label} confidence range.`,
      comments,
    );
  };

  const openKeywordDrilldown = (keyword: string, source: SentimentResult[] = results.results) => {
    setSelectedDistribution(null);
    const normalized = keyword.toLowerCase();
    const comments = source.filter(
      (result) =>
        result.keywords.some((item) => item.toLowerCase() === normalized) ||
        result.comment.toLowerCase().includes(normalized),
    );
    openDrilldownDialog(
      `Keyword: ${keyword}`,
      `${comments.length} comments contain or were tagged with "${keyword}".`,
      comments,
    );
  };

  const activeClasses = chartData
    .filter((item) => item.value > 0)
    .map((item) => item.key);
  const visibleConfidenceClasses =
    confidenceClassFilter === "all"
      ? activeClasses
      : activeClasses.filter((sentiment) => sentiment === confidenceClassFilter);

  const percentageData = chartData.map((item) => ({
    ...item,
    percentage: totalClassified ? Math.round((item.value / totalClassified) * 1000) / 10 : 0,
  }));

  const confidenceBuckets = [
    { label: "0-20%", min: 0, max: 0.2 },
    { label: "20-40%", min: 0.2, max: 0.4 },
    { label: "40-60%", min: 0.4, max: 0.6 },
    { label: "60-80%", min: 0.6, max: 0.8 },
    { label: "80-100%", min: 0.8, max: 1.01 },
  ];

  const confidenceDistribution = confidenceBuckets.map(({ label, min, max }) => {
    const row: Record<string, string | number> = { range: label };
    activeClasses.forEach((sentiment) => {
      row[sentiment] = results.results.filter(
        (result) => result.sentiment === sentiment && result.confidence >= min && result.confidence < max,
      ).length;
    });
    return row;
  });

  const cmCounts: Record<string, number> = {};
  const cmRaw: Record<string, Record<string, number>> = {};

  activeClasses.forEach((sentiment) => {
    cmCounts[sentiment] = 0;
    cmRaw[sentiment] = {};
    activeClasses.forEach((target) => {
      cmRaw[sentiment][target] = 0;
    });
  });

  results.results.forEach((result) => {
    if (!activeClasses.includes(result.sentiment)) return;
    cmCounts[result.sentiment] += 1;
    cmRaw[result.sentiment][result.sentiment] += result.confidence;

    const spread = (1 - result.confidence) / Math.max(activeClasses.length - 1, 1);
    activeClasses
      .filter((sentiment) => sentiment !== result.sentiment)
      .forEach((sentiment) => {
        cmRaw[result.sentiment][sentiment] += spread;
      });
  });

  const confidenceMatrix: Record<string, Record<string, number>> = {};
  activeClasses.forEach((sentiment) => {
    confidenceMatrix[sentiment] = {};
    activeClasses.forEach((target) => {
      confidenceMatrix[sentiment][target] = cmCounts[sentiment]
        ? cmRaw[sentiment][target] / cmCounts[sentiment]
        : 0;
    });
  });

  const wordCloudSource = useMemo(() => {
    if (wordCloudFilter === "all") return results.results;
    return results.results.filter((result) => result.sentiment === wordCloudFilter);
  }, [results.results, wordCloudFilter]);

  const wordCloudData = useMemo(() => buildWordCloudData(wordCloudSource), [wordCloudSource]);

  const handleWordCloudStats = useCallback((stats: { drawn: number; total: number }) => {
    setWordCloudStats(stats);
  }, []);

  useEffect(() => {
    setShowAllWordCloudTerms(false);
  }, [wordCloudFilter]);

  const downloadPdfDashboard = () => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const fileStamp = results.timestamp.toISOString().replace(/[:.]/g, "-");
    const maxCount = Math.max(...percentageData.map((item) => item.value), 1);
    const topKeywords = buildWordCloudData(results.results).slice(0, 24);
    const dominant = percentageData.reduce((best, item) => (item.value > best.value ? item : best), percentageData[0]);
    const colors: Record<SentimentResult["sentiment"], [number, number, number]> = {
      positive: [33, 179, 107],
      neutral: [113, 128, 150],
      negative: [224, 68, 68],
      spam: [241, 140, 46],
    };
    const softColors: Record<SentimentResult["sentiment"], [number, number, number]> = {
      positive: [233, 251, 241],
      neutral: [243, 246, 250],
      negative: [255, 240, 240],
      spam: [255, 246, 232],
    };
    const pct = (value: number) => `${value.toFixed(1)}%`;
    const averageForClass = (sentiment: SentimentResult["sentiment"]) => {
      const rows = results.results.filter((result) => result.sentiment === sentiment);
      if (rows.length === 0) return 0;
      return rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length;
    };
    const topWordsForClass = (sentiment: SentimentResult["sentiment"]) =>
      buildWordCloudData(results.results.filter((result) => result.sentiment === sentiment))
        .slice(0, 4)
        .map((word) => word.text)
        .join(", ");

    let y = margin;

    const setText = (size: number, color: [number, number, number] = [23, 33, 31], style: "normal" | "bold" = "normal") => {
      pdf.setFont("helvetica", style);
      pdf.setFontSize(size);
      pdf.setTextColor(...color);
    };
    const fill = (color: [number, number, number]) => pdf.setFillColor(...color);
    const stroke = (color: [number, number, number]) => pdf.setDrawColor(...color);
    const addPageIfNeeded = (neededHeight: number) => {
      if (y + neededHeight <= pageHeight - margin) return;
      pdf.addPage("a4", "portrait");
      y = margin;
    };
    const sectionTitle = (title: string) => {
      addPageIfNeeded(14);
      setText(10, [80, 91, 87], "bold");
      pdf.text(title.toUpperCase(), margin, y);
      y += 7;
      stroke([224, 228, 226]);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 7;
    };
    const roundedPanel = (x: number, top: number, width: number, height: number, bg: [number, number, number] = [255, 252, 246]) => {
      fill(bg);
      stroke([224, 228, 226]);
      pdf.roundedRect(x, top, width, height, 3, 3, "FD");
    };
    const drawPdfWordCloud = () => {
      const cloudHeight = 76;
      addPageIfNeeded(cloudHeight + 16);
      const cloudTop = y;
      roundedPanel(margin, cloudTop, contentWidth, cloudHeight, [250, 252, 251]);

      fill([233, 251, 241]);
      pdf.circle(margin + contentWidth * 0.22, cloudTop + 20, 10, "F");
      fill([255, 240, 240]);
      pdf.circle(margin + contentWidth * 0.76, cloudTop + 26, 12, "F");
      fill([255, 246, 232]);
      pdf.circle(margin + contentWidth * 0.58, cloudTop + 55, 9, "F");

      const slots = [
        [50, 35, 1.34],
        [31, 25, 1.12],
        [68, 25, 1.08],
        [22, 43, 0.98],
        [78, 43, 0.96],
        [42, 53, 0.9],
        [60, 53, 0.88],
        [15, 22, 0.82],
        [86, 22, 0.82],
        [31, 64, 0.78],
        [70, 65, 0.78],
        [49, 17, 0.78],
        [13, 60, 0.72],
        [88, 61, 0.72],
        [24, 12, 0.7],
        [76, 12, 0.7],
        [41, 72, 0.68],
        [59, 73, 0.68],
        [9, 36, 0.66],
        [92, 36, 0.66],
        [36, 39, 0.64],
        [64, 39, 0.64],
        [18, 74, 0.62],
        [82, 75, 0.62],
        [50, 64, 0.62],
        [28, 53, 0.6],
        [72, 53, 0.6],
        [38, 13, 0.58],
        [62, 13, 0.58],
        [50, 80, 0.56],
        [7, 76, 0.54],
        [93, 77, 0.54],
      ];
      const palette: Array<[number, number, number]> = [
        colors.positive,
        colors.neutral,
        colors.negative,
        colors.spam,
        [47, 111, 148],
        [24, 35, 31],
      ];
      const maxWord = Math.max(topKeywords[0]?.size ?? 1, 1);
      const minWord = Math.max(topKeywords[topKeywords.length - 1]?.size ?? 1, 1);
      topKeywords.slice(0, slots.length).forEach((word, index) => {
        const [xPct, yPct, boost] = slots[index];
        const ratio =
          maxWord === minWord
            ? 0.65
            : (Math.log(word.size + 1) - Math.log(minWord + 1)) / (Math.log(maxWord + 1) - Math.log(minWord + 1));
        let fontSize = Math.max(6.4, (7 + ratio * 11) * boost);
        setText(fontSize, palette[index % palette.length], index < 10 ? "bold" : "normal");

        let label = word.text;
        let textWidth = pdf.getTextWidth(label);
        while (textWidth > contentWidth * 0.3 && fontSize > 6) {
          fontSize -= 0.5;
          setText(fontSize, palette[index % palette.length], index < 10 ? "bold" : "normal");
          textWidth = pdf.getTextWidth(label);
        }

        const centerX = margin + (contentWidth * xPct) / 100;
        const textX = Math.min(pageWidth - margin - textWidth - 2, Math.max(margin + 2, centerX - textWidth / 2));
        const textY = cloudTop + (cloudHeight * yPct) / 100;
        pdf.text(label, textX, textY);

        if (index < 8) {
          setText(5.4, [105, 115, 111]);
          pdf.text(String(word.size), textX + textWidth + 1.5, textY - 0.8);
        }
      });
      y += cloudHeight + 12;
    };

    fill([24, 35, 31]);
    pdf.roundedRect(margin, y, contentWidth, 38, 5, 5, "F");
    setText(8, [166, 242, 200], "bold");
    pdf.text("SENTIMENT ANALYSIS RESULT DASHBOARD", margin + 7, y + 10);
    setText(26, [255, 250, 240], "bold");
    pdf.text("Feedback Signal Report", margin + 7, y + 24);
    y += 45;

    const kpis = [
      ["Satisfaction", `${results.satisfactionScore}%`, "Positive + half neutral"],
      ["Avg Confidence", pct(results.averageConfidence * 100), "Mean model certainty"],
      ["Unique Rows", String(results.uniqueComments), `${results.duplicatesIgnored} duplicates ignored`],
      ["Dominant", dominant.name, `${dominant.value} comments`],
    ];
    const gap = 4;
    const cardWidth = (contentWidth - gap * 3) / 4;
    kpis.forEach(([label, value, note], index) => {
      const x = margin + index * (cardWidth + gap);
      roundedPanel(x, y, cardWidth, 26);
      setText(7, [105, 115, 111], "bold");
      pdf.text(label.toUpperCase(), x + 4, y + 7);
      setText(15, [23, 33, 31], "bold");
      pdf.text(String(value), x + 4, y + 16);
      setText(7, [105, 115, 111]);
      pdf.text(pdf.splitTextToSize(String(note), cardWidth - 8), x + 4, y + 22);
    });
    y += 35;

    sectionTitle("Class Summary");
    percentageData.forEach((item) => {
      addPageIfNeeded(22);
      const [r, g, b] = colors[item.key];
      roundedPanel(margin, y, contentWidth, 17, softColors[item.key]);
      fill([r, g, b]);
      pdf.circle(margin + 6, y + 8.5, 2.2, "F");
      setText(10, [23, 33, 31], "bold");
      pdf.text(item.name, margin + 12, y + 7);
      setText(8, [105, 115, 111]);
      pdf.text(`${item.value} comments | ${pct(item.percentage)} share | ${pct(averageForClass(item.key) * 100)} confidence`, margin + 12, y + 13);
      fill([230, 235, 232]);
      pdf.roundedRect(pageWidth - margin - 62, y + 5, 44, 5, 2.5, 2.5, "F");
      fill([r, g, b]);
      pdf.roundedRect(pageWidth - margin - 62, y + 5, Math.max(2, (item.value / maxCount) * 44), 5, 2.5, 2.5, "F");
      setText(9, [23, 33, 31], "bold");
      pdf.text(String(item.value), pageWidth - margin - 10, y + 9, { align: "right" });
      y += 21;
    });

    sectionTitle("Overall Distribution Chart");
    const stackedX = margin;
    const stackedY = y;
    let cursor = stackedX;
    percentageData.forEach((item) => {
      const width = Math.max(item.value > 0 ? 2 : 0, (item.percentage / 100) * contentWidth);
      if (width > 0) {
        fill(colors[item.key]);
        pdf.rect(cursor, stackedY, width, 11, "F");
        cursor += width;
      }
    });
    stroke([255, 255, 255]);
    pdf.rect(stackedX, stackedY, contentWidth, 11, "S");
    y += 19;
    percentageData.forEach((item, index) => {
      const x = margin + (index % 2) * 88;
      const rowY = y + Math.floor(index / 2) * 8;
      fill(colors[item.key]);
      pdf.circle(x + 2, rowY - 1.5, 1.8, "F");
      setText(8, [23, 33, 31]);
      pdf.text(`${item.name}: ${pct(item.percentage)} (${item.value})`, x + 7, rowY);
    });
    y += 20;

    sectionTitle("Confidence Score Distribution");
    activeClasses.forEach((sentiment) => {
      addPageIfNeeded(34);
      setText(9, colors[sentiment], "bold");
      pdf.text(sentimentLabels[sentiment], margin, y);
      y += 6;
      const classTotal = Math.max(results.sentimentCounts[sentiment], 1);
      confidenceBuckets.forEach((bucket) => {
        const count = results.results.filter(
          (result) => result.sentiment === sentiment && result.confidence >= bucket.min && result.confidence < bucket.max,
        ).length;
        setText(7, [105, 115, 111]);
        pdf.text(bucket.label, margin, y + 3);
        fill([235, 238, 236]);
        pdf.roundedRect(margin + 23, y, 108, 4, 2, 2, "F");
        fill(colors[sentiment]);
        pdf.roundedRect(margin + 23, y, Math.max(count ? 2 : 0, (count / classTotal) * 108), 4, 2, 2, "F");
        setText(7, [23, 33, 31], "bold");
        pdf.text(String(count), margin + 136, y + 3.3);
        y += 6;
      });
      y += 3;
    });

    sectionTitle("Keyword Word Cloud");
    drawPdfWordCloud();

    sectionTitle("Estimated Confidence Matrix");
    const matrixColWidth = contentWidth / Math.max(activeClasses.length + 1, 2);
    const tableTop = y;
    fill([245, 248, 247]);
    pdf.rect(margin, tableTop, contentWidth, 8, "F");
    setText(7, [80, 91, 87], "bold");
    pdf.text("Predicted", margin + 2, tableTop + 5);
    activeClasses.forEach((sentiment, index) => {
      pdf.text(sentimentLabels[sentiment], margin + matrixColWidth * (index + 1) + 2, tableTop + 5);
    });
    y += 8;
    activeClasses.forEach((rowSentiment) => {
      addPageIfNeeded(10);
      setText(7, [23, 33, 31], "bold");
      pdf.text(sentimentLabels[rowSentiment], margin + 2, y + 5);
      activeClasses.forEach((colSentiment, index) => {
        const value = (confidenceMatrix[rowSentiment]?.[colSentiment] ?? 0) * 100;
        fill(rowSentiment === colSentiment ? [233, 251, 241] : [255, 246, 246]);
        stroke([224, 228, 226]);
        pdf.rect(margin + matrixColWidth * (index + 1), y, matrixColWidth, 8, "FD");
        setText(7, [23, 33, 31]);
        pdf.text(pct(value), margin + matrixColWidth * (index + 1) + 2, y + 5);
      });
      y += 8;
    });
    y += 7;

    sectionTitle("Top Evidence Comments");
    chartData
      .filter((item) => item.value > 0)
      .forEach((item) => {
        const comments = results.results
          .filter((result) => result.sentiment === item.key)
          .slice()
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 2);
        comments.forEach((comment) => {
          addPageIfNeeded(30);
          roundedPanel(margin, y, contentWidth, 24, softColors[item.key]);
          fill(colors[item.key]);
          pdf.rect(margin, y, 2.5, 24, "F");
          setText(8, colors[item.key], "bold");
          pdf.text(`${item.name} | ${pct(comment.confidence * 100)} confidence`, margin + 6, y + 6);
          setText(8, [23, 33, 31]);
          pdf.text(pdf.splitTextToSize(comment.comment, contentWidth - 12), margin + 6, y + 12);
          y += 29;
        });
      });

    setText(7, [105, 115, 111]);
    pdf.text(`Generated ${results.timestamp.toLocaleString()} | ${results.modelUsed} | ${results.jobId}`, margin, pageHeight - 8);
    pdf.save(`result_dashboard_${results.jobId}_${fileStamp}.pdf`);
    toast.success("PDF dashboard downloaded in portrait format");
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-analytics-green/10 text-analytics-green hover:bg-analytics-green/10">
              Analysis complete
            </Badge>
            <span className="text-sm text-muted-foreground">{results.modelUsed}</span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Results Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Job {results.jobId} - {results.timestamp.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={downloadPdfDashboard} className="gap-2">
            <FileText className="h-4 w-4" />
            Export PDF Dashboard
          </Button>
          <Button onClick={onNewAnalysis} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            New Analysis
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total comments"
          value={results.totalComments}
          detail={`${results.duplicatesIgnored} duplicates ignored`}
          icon={MessageSquareText}
        />
        <StatCard
          label="Satisfaction"
          value={`${results.satisfactionScore}%`}
          detail="Positive plus half neutral"
          icon={Target}
        />
        <StatCard label="Positive rate" value={`${positiveRate}%`} detail="Share of classified rows" icon={Smile} />
        <StatCard label="Negative rate" value={`${negativeRate}%`} detail="Rows needing attention" icon={Frown} />
        <StatCard
          label="Avg confidence"
          value={`${(results.averageConfidence * 100).toFixed(1)}%`}
          detail={`${results.sentimentCounts.spam} spam rows`}
          icon={ShieldAlert}
        />
      </section>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-muted p-1">
          <TabsTrigger value="overview" className="py-2">
            Overview
          </TabsTrigger>
          <TabsTrigger value="confidence" className="py-2">
            Confidence
          </TabsTrigger>
          <TabsTrigger value="keywords" className="py-2">
            Keywords
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
      <Card className="panel-card">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Satisfaction Score formula: </span>
            ((Positive + 0.5 x Neutral) / Total) x 100 = (({results.sentimentCounts.positive} + 0.5 x{" "}
            {results.sentimentCounts.neutral}) / {results.uniqueComments}) x 100 =
            <span className={`ml-1 font-bold ${scoreColor}`}>{results.satisfactionScore}%</span>
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="panel-card">
          <CardHeader className="border-b border-border">
            <CardTitle>Sentiment Counts</CardTitle>
            <CardDescription>Volume by predicted class.</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={CHART_COLORS[entry.key]}
                        className="cursor-pointer outline-none"
                        onClick={() => openDistributionDialog(entry.key)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="panel-card">
          <CardHeader className="border-b border-border">
            <CardTitle>Distribution</CardTitle>
            <CardDescription>Relative share of each sentiment.</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={62} outerRadius={96}>
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={CHART_COLORS[entry.key]}
                        stroke="hsl(var(--card))"
                        strokeWidth={3}
                        className="cursor-pointer outline-none"
                        onClick={() => openDistributionDialog(entry.key)}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {chartData.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="legend-row text-left transition-colors hover:border-primary/40 hover:bg-primary-muted/45"
                  onClick={() => openDistributionDialog(item.key)}
                >
                  <span style={{ background: CHART_COLORS[item.key] }} />
                  <p>{item.name}</p>
                  <strong>{item.value}</strong>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="panel-card">
          <CardHeader className="border-b border-border">
            <CardTitle>Sentiment Percentage</CardTitle>
            <CardDescription>Share of the analyzed dataset by class.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {percentageData.map((item) => (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[item.key] }} />
                    <span className="font-medium text-foreground">{item.name}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.percentage}% ({item.value})
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.percentage}%`, background: CHART_COLORS[item.key] }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="panel-card">
          <CardHeader className="border-b border-border">
            <CardTitle>Confidence Distribution</CardTitle>
            <CardDescription>How prediction confidence is distributed across sentiment classes.</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confidenceDistribution}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  {activeClasses.map((sentiment) => (
                    <Bar
                      key={sentiment}
                      dataKey={sentiment}
                      name={sentimentLabels[sentiment]}
                      stackId="confidence"
                      fill={CHART_COLORS[sentiment]}
                      radius={[4, 4, 0, 0]}
                      className="cursor-pointer"
                      onClick={(_, index) => openConfidenceDrilldown(sentiment, confidenceBuckets[index])}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>
        </TabsContent>

        <TabsContent value="confidence" className="space-y-6">
      <Card className="panel-card">
        <CardHeader className="border-b border-border">
          <CardTitle>Estimated Confidence Matrix</CardTitle>
          <CardDescription>
            A model-confidence view of class certainty. The diagonal shows confidence in the predicted class.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          {activeClasses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/40 py-10 text-center text-sm text-muted-foreground">
              No classes available for matrix rendering.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[520px]">
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `150px repeat(${activeClasses.length}, minmax(96px, 1fr))` }}
                >
                  <div />
                  {activeClasses.map((sentiment) => (
                    <div key={sentiment} className="matrix-label text-center">
                      Predicted {sentimentLabels[sentiment]}
                    </div>
                  ))}

                  {activeClasses.map((rowSentiment) => (
                    <Fragment key={rowSentiment}>
                      <div key={`${rowSentiment}-label`} className="matrix-label flex items-center justify-end pr-2">
                        Actual {sentimentLabels[rowSentiment]}
                      </div>
                      {activeClasses.map((colSentiment) => {
                        const value = confidenceMatrix[rowSentiment]?.[colSentiment] ?? 0;
                        const isDiagonal = rowSentiment === colSentiment;
                        const alpha = isDiagonal
                          ? Math.max(0.12, Math.min(0.82, value))
                          : Math.max(0.05, Math.min(0.35, value));

                        return (
                          <div
                            key={`${rowSentiment}-${colSentiment}`}
                            className="matrix-cell"
                            style={{
                              background: isDiagonal
                                ? `hsl(151 61% 42% / ${alpha})`
                                : `hsl(350 72% 52% / ${alpha})`,
                              borderColor: isDiagonal ? "hsl(151 61% 42% / 0.28)" : "hsl(var(--border))",
                            }}
                            title={`${sentimentLabels[rowSentiment]} to ${sentimentLabels[colSentiment]}: ${(value * 100).toFixed(1)}%`}
                          >
                            <span>{(value * 100).toFixed(0)}%</span>
                            <small>n = {cmCounts[rowSentiment]}</small>
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
                <div className="mt-5 border-t border-border pt-4">
                  <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Estimated Precision per Class
                  </p>
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${activeClasses.length}, 1fr)` }}>
                    {activeClasses.map((sentiment) => (
                      <div key={`${sentiment}-precision`} className="rounded-lg border border-border bg-muted/35 p-3 text-center">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: CHART_COLORS[sentiment] }}>
                          {sentimentLabels[sentiment]}
                        </p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                          {((confidenceMatrix[sentiment]?.[sentiment] ?? 0) * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">n = {cmCounts[sentiment]}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    Estimated from model confidence. Diagonal cells show certainty in the predicted class.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Confidence Score Distribution by Class</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Filter to one sentiment class, or choose all to compare every class.
            </p>
          </div>
          <Select
            value={confidenceClassFilter}
            onValueChange={(value) => setConfidenceClassFilter(value as "all" | SentimentResult["sentiment"])}
          >
            <SelectTrigger className="w-full bg-card sm:w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {activeClasses.map((sentiment) => (
                <SelectItem key={sentiment} value={sentiment}>
                  {sentimentLabels[sentiment]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={`grid gap-5 ${confidenceClassFilter === "all" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          {visibleConfidenceClasses.map((sentiment) => {
            const color = CHART_COLORS[sentiment];
            const classData = confidenceBuckets.map(({ label, min, max }) => ({
              range: label,
              count: results.results.filter(
                (result) =>
                  result.sentiment === sentiment && result.confidence >= min && result.confidence < max,
              ).length,
            }));
            const classTotal = classData.reduce((sum, item) => sum + item.count, 0);
            const peak = classData.reduce(
              (best, item) => (item.count > best.count ? item : best),
              classData[0],
            );

            return (
              <Card key={`${sentiment}-confidence-card`} className="panel-card overflow-hidden">
                <div className="h-1" style={{ background: color }} />
                <CardHeader className="border-b border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="capitalize">{sentimentLabels[sentiment]}</CardTitle>
                      <CardDescription>
                        Total {classTotal}
                        {classTotal > 0 ? `, peak ${peak.range}` : ""}
                      </CardDescription>
                    </div>
                    <SentimentBadge sentiment={sentiment} />
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classData} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="range" tickLine={false} axisLine={false} fontSize={10} />
                        <YAxis tickLine={false} axisLine={false} fontSize={10} width={24} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="count"
                          fill={color}
                          radius={[5, 5, 0, 0]}
                          className="cursor-pointer"
                          onClick={(_, index) => openConfidenceDrilldown(sentiment, confidenceBuckets[index])}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-1">
                    {classData.map((item) => {
                      const pct = classTotal > 0 ? (item.count / classTotal) * 100 : 0;
                      return (
                        <div key={`${sentiment}-${item.range}`} className="rounded-md bg-muted/45 py-2 text-center">
                          <p className="text-sm font-semibold tabular-nums" style={{ color }}>
                            {item.count}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
      <Card className="panel-card">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Keyword Cloud</CardTitle>
              <CardDescription>
                Frequently appearing terms across{" "}
                {wordCloudFilter === "all" ? "all comments" : `${sentimentLabels[wordCloudFilter].toLowerCase()} comments`}.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "positive", "negative", "neutral", "spam"] as const).map((filter) => {
                const active = wordCloudFilter === filter;
                const label = filter === "all" ? "All" : sentimentLabels[filter];

                return (
                  <Button
                    key={filter}
                    type="button"
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWordCloudFilter(filter)}
                    className="h-8"
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{wordCloudStats.drawn}</span>
            <span>
              {wordCloudStats.drawn === 1 ? "word" : "words"} visible
            </span>
            <span className="text-muted-foreground">from</span>
            <span className="font-medium text-foreground">{wordCloudStats.total}</span>
            <span>{wordCloudStats.total === 1 ? "prepared word" : "prepared words"}</span>
            <span className="text-muted-foreground">across</span>
            <span className="font-medium text-foreground">{wordCloudSource.length}</span>
            <span>
              {wordCloudFilter === "all"
                ? "comments"
                : `${sentimentLabels[wordCloudFilter].toLowerCase()} comments`}
            </span>
            {wordCloudStats.total > wordCloudStats.drawn && (
              <Badge variant="outline" className="bg-muted/50">
                {wordCloudStats.total - wordCloudStats.drawn} did not fit
              </Badge>
            )}
          </div>
          <div className="mb-4 rounded-lg border border-border bg-muted/25 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Prepared keywords, ranked by importance
              </p>
              {wordCloudData.length > 12 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowAllWordCloudTerms((value) => !value)}
                >
                  {showAllWordCloudTerms ? "Show less" : `Show all ${wordCloudData.length}`}
                </Button>
              )}
            </div>
            <div className="flex max-h-52 flex-wrap gap-1.5 overflow-y-auto pr-1">
              {(showAllWordCloudTerms ? wordCloudData : wordCloudData.slice(0, 12)).map((word, index) => (
                <Button
                  key={word.text}
                  variant="outline"
                  size="sm"
                  className={`h-7 gap-1.5 rounded-full bg-card px-2 text-xs ${index < 5 ? "border-primary/25 text-primary" : "text-muted-foreground"}`}
                  title={`${word.text}: importance ${word.size}`}
                  onClick={() => openKeywordDrilldown(word.text, wordCloudSource)}
                >
                  <span className="font-mono text-[10px] opacity-70">#{index + 1}</span>
                  {word.text}
                  <span className="rounded bg-muted px-1 font-mono text-[10px]">{word.size}</span>
                </Button>
              ))}
              {!showAllWordCloudTerms && wordCloudData.length > 12 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 rounded-full px-2 text-xs"
                  onClick={() => setShowAllWordCloudTerms(true)}
                >
                  +{wordCloudData.length - 12} more
                </Button>
              )}
            </div>
          </div>
          <WordCloudComponent
            words={wordCloudData}
            height={320}
            onRenderStats={handleWordCloudStats}
            onWordClick={(word) => openKeywordDrilldown(word, wordCloudSource)}
          />
        </CardContent>
      </Card>
        </TabsContent>
      
      </Tabs>

      <Dialog
        open={selectedDistribution !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDistribution(null);
            setVisibleDistributionComments(20);
          }
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden p-0">
          {selectedDistribution && (
            <>
              <DialogHeader className="border-b border-border p-5 pb-4">
                <div className="flex items-start justify-between gap-4 pr-8">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: CHART_COLORS[selectedDistribution] }}
                      />
                      {sentimentLabels[selectedDistribution]} Comments
                    </DialogTitle>
                    <DialogDescription className="mt-2">
                      Showing {Math.min(visibleDistributionComments, selectedDistributionComments.length)} of{" "}
                      {selectedDistributionComments.length} comments from the distribution graph.
                    </DialogDescription>
                  </div>
                  <SentimentBadge sentiment={selectedDistribution} />
                </div>
              </DialogHeader>

              <div className="max-h-[58vh] space-y-3 overflow-y-auto p-5">
                {selectedDistributionComments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/35 py-12 text-center">
                    <p className="font-medium text-foreground">
                      No {sentimentLabels[selectedDistribution].toLowerCase()} comments found.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This class has no rows in the current analysis.
                    </p>
                  </div>
                ) : (
                  selectedDistributionComments.slice(0, visibleDistributionComments).map((result, index) => (
                    <div key={`${selectedDistribution}-${index}-${result.comment}`} className="rounded-lg border border-border bg-card p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <ConfidenceMeter confidence={result.confidence} sentiment={result.sentiment} />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.keywords.slice(0, 3).map((keyword) => (
                            <Button
                              key={keyword}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 rounded-full bg-muted/50 px-2 text-xs"
                              onClick={() => openKeywordDrilldown(keyword)}
                            >
                              {keyword}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm leading-6 text-foreground">{result.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {selectedDistributionComments.length > visibleDistributionComments && (
                <div className="border-t border-border p-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setVisibleDistributionComments((count) => count + 20)}
                  >
                    Show 20 more comments
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={drilldownDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDrilldownDialog(null);
            setVisibleDrilldownComments(20);
          }
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden p-0">
          {drilldownDialog && (
            <>
              <DialogHeader className="border-b border-border p-5 pb-4">
                <DialogTitle>{drilldownDialog.title}</DialogTitle>
                <DialogDescription className="mt-2">
                  Showing {Math.min(visibleDrilldownComments, drilldownDialog.comments.length)} of{" "}
                  {drilldownDialog.comments.length}. {drilldownDialog.description}
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[58vh] space-y-3 overflow-y-auto p-5">
                {drilldownDialog.comments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/35 py-12 text-center">
                    <p className="font-medium text-foreground">No matching comments found.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try another chart segment or keyword.
                    </p>
                  </div>
                ) : (
                  drilldownDialog.comments.slice(0, visibleDrilldownComments).map((result, index) => (
                    <div
                      key={`${drilldownDialog.title}-${index}-${result.comment}`}
                      className="rounded-lg border border-border bg-card p-4"
                      style={{ borderLeft: `4px solid ${CHART_COLORS[result.sentiment]}` }}
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <SentimentBadge sentiment={result.sentiment} />
                          <ConfidenceMeter confidence={result.confidence} sentiment={result.sentiment} />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.keywords.slice(0, 4).map((keyword) => (
                            <Button
                              key={keyword}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 rounded-full bg-muted/50 px-2 text-xs"
                              onClick={() => openKeywordDrilldown(keyword)}
                            >
                              {keyword}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm leading-6 text-foreground">{result.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {drilldownDialog.comments.length > visibleDrilldownComments && (
                <div className="border-t border-border p-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setVisibleDrilldownComments((count) => count + 20)}
                  >
                    Show 20 more comments
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
