import { useEffect, useState } from "react";
import { DataInput } from "@/components/DataInput";
import { SentimentAnalysis } from "@/components/SentimentAnalysis";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import {
  BarChart3,
  CheckCircle2,
  Circle,
  Database,
  Moon,
  LineChart,
  MessageSquareText,
  Sun,
} from "lucide-react";

interface ParsedData {
  comments: string[];
  rawCount: number;
  uniqueCount: number;
  duplicateCount: number;
  singleTokenWarning: boolean;
  singleTokenPercentage: number;
}

interface AnalysisResults {
  jobId: string;
  timestamp: Date;
  results: Array<{
    comment: string;
    sentiment: "positive" | "negative" | "neutral" | "spam";
    confidence: number;
    keywords: string[];
    is_spam?: boolean;
  }>;
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

type AppState = "input" | "analysis" | "results";

const STEPS = [
  { step: 1, label: "Prepare data", state: "input" as AppState },
  { step: 2, label: "Run model", state: "analysis" as AppState },
  { step: 3, label: "Review insights", state: "results" as AppState },
];

const PALETTES = [
  {
    id: "clinical",
    name: "Clinical",
  },
  {
    id: "graphite",
    name: "Graphite",
  },
] as const;

type PaletteId = (typeof PALETTES)[number]["id"];

const Index = () => {
  const [appState, setAppState] = useState<AppState>("input");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [palette, setPalette] = useState<PaletteId>(() => {
    if (typeof window === "undefined") return "clinical";
    const saved = window.localStorage.getItem("sentiment-palette");
    return PALETTES.some((item) => item.id === saved) ? (saved as PaletteId) : "clinical";
  });

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    window.localStorage.setItem("sentiment-palette", palette);
  }, [palette]);

  const handleDataParsed = (data: ParsedData) => setParsedData(data);
  const handleConfirmAnalysis = (data: ParsedData) => {
    setParsedData(data);
    setAppState("analysis");
  };
  const handleAnalysisComplete = (res: AnalysisResults) => {
    setAnalysisResults(res);
    setAppState("results");
  };
  const handleNewAnalysis = () => {
    setAppState("input");
    setParsedData(null);
    setAnalysisResults(null);
  };

  const isStepActive = (state: AppState) => appState === state;
  const isStepComplete = (step: number) =>
    (step === 1 && (appState === "analysis" || appState === "results")) ||
    (step === 2 && appState === "results");
  const activePaletteName = PALETTES.find((item) => item.id === palette)?.name ?? "Clinical";
  const togglePalette = () => setPalette((current) => (current === "clinical" ? "graphite" : "clinical"));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="app-shell border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <LineChart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Sentiment Intelligence
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Analysis Workspace
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Prepare customer feedback, run sentiment classification, and inspect the evidence behind every result.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-background p-2 text-sm shadow-sm">
                <div className="stat-strip">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                  <span>{parsedData?.rawCount ?? 0}</span>
                  <small>rows</small>
                </div>
                <div className="stat-strip">
                  <Database className="h-4 w-4 text-analytics-green" />
                  <span>{parsedData?.uniqueCount ?? 0}</span>
                  <small>unique</small>
                </div>
                <div className="stat-strip">
                  <BarChart3 className="h-4 w-4 text-analytics-orange" />
                  <span>{analysisResults ? `${analysisResults.satisfactionScore}%` : "--"}</span>
                  <small>score</small>
                </div>
              </div>

              <button
                type="button"
                className="palette-toggle"
                onClick={togglePalette}
                title={`Current palette: ${activePaletteName}`}
                aria-label={`Switch from ${activePaletteName} palette`}
              >
                {palette === "clinical" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <nav className="workflow-rail" aria-label="Analysis progress">
            {STEPS.map(({ step, label, state }) => {
              const active = isStepActive(state);
              const complete = isStepComplete(step);
              const Icon = complete ? CheckCircle2 : Circle;

              return (
                <div
                  key={step}
                  className={`workflow-step ${active ? "is-active" : ""} ${complete ? "is-complete" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </div>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {appState === "input" && (
          <DataInput onDataParsed={handleDataParsed} onConfirmAnalysis={handleConfirmAnalysis} />
        )}
        {appState === "analysis" && parsedData && (
          <SentimentAnalysis comments={parsedData.comments} onAnalysisComplete={handleAnalysisComplete} />
        )}
        {appState === "results" && analysisResults && (
          <ResultsDashboard results={analysisResults} onNewAnalysis={handleNewAnalysis} />
        )}
      </main>
    </div>
  );
};

export default Index;
