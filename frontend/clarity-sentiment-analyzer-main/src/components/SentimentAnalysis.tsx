import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Brain, CheckCircle2, Clock, Cpu, Globe, Play, Shield, Zap } from "lucide-react";
import { toast } from "sonner";

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

interface SentimentAnalysisProps {
  comments: string[];
  onAnalysisComplete: (results: AnalysisResults) => void;
}

const analyzeSentiment = (text: string): { sentiment: "positive" | "negative" | "neutral"; confidence: number } => {
  const positiveWords = [
    "good",
    "great",
    "excellent",
    "amazing",
    "wonderful",
    "fantastic",
    "perfect",
    "love",
    "best",
    "awesome",
    "helpful",
    "professional",
    "caring",
    "efficient",
    "clean",
    "friendly",
    "satisfied",
    "pleased",
    "happy",
    "outstanding",
    "impressive",
    "quality",
    "reliable",
    "comfortable",
    "convenient",
    "smooth",
    "easy",
  ];

  const negativeWords = [
    "bad",
    "terrible",
    "awful",
    "horrible",
    "worst",
    "hate",
    "disappointing",
    "poor",
    "inadequate",
    "frustrating",
    "annoying",
    "slow",
    "expensive",
    "difficult",
    "complicated",
    "confusing",
    "unclear",
    "unprofessional",
    "rude",
    "unhelpful",
    "broken",
    "failed",
    "problem",
    "issue",
    "complaint",
    "concern",
  ];

  const words = text.toLowerCase().split(/\s+/);
  let positiveScore = 0;
  let negativeScore = 0;

  words.forEach((word) => {
    const cleanWord = word.replace(/[^\w]/g, "");
    if (positiveWords.includes(cleanWord)) positiveScore += 1;
    if (negativeWords.includes(cleanWord)) negativeScore += 1;
  });

  const total = positiveScore + negativeScore;
  if (total === 0) {
    return { sentiment: "neutral", confidence: 0.6 + Math.random() * 0.2 };
  }

  const positiveRatio = positiveScore / total;
  if (positiveRatio > 0.6) {
    return { sentiment: "positive", confidence: 0.7 + positiveRatio * 0.3 };
  }
  if (positiveRatio < 0.4) {
    return { sentiment: "negative", confidence: 0.7 + (1 - positiveRatio) * 0.3 };
  }
  return { sentiment: "neutral", confidence: 0.6 + Math.random() * 0.2 };
};

const extractKeywords = (text: string): string[] => {
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "me",
    "him",
    "her",
    "us",
    "them",
    "यह",
    "ये",
    "है",
    "हैं",
    "था",
    "थी",
    "थे",
    "और",
    "को",
    "में",
    "से",
    "का",
    "की",
    "के",
    "पर",
    "कर",
    "करके",
    "बहुत",
    "अभी",
    "मुझे",
    "हम",
    "आप",
    "iska",
    "isko",
    "yeh",
    "hai",
    "hain",
    "mein",
    "bahut",
  ]);

  const words = Array.from(text.toLowerCase().matchAll(/[\p{L}\p{M}\p{N}]+/gu))
    .map(([word]) => word)
    .filter((word) => Array.from(word).length > 1 && !stopWords.has(word));

  const frequency: Record<string, number> = {};
  words.forEach((word) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
};

const analyzeWithBackend = async (
  text: string,
): Promise<{ sentiment: "positive" | "negative" | "neutral" | "spam"; confidence: number; is_spam?: boolean }> => {
  let res: Response;

  try {
    res = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    throw new Error("FastAPI backend is not reachable at http://127.0.0.1:8000");
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Backend error: ${res.status} ${err}`);
  }

  return await res.json();
};

const modelOptions = [
  {
    id: "pattern-local",
    name: "Pattern Matching",
    description: "Fast baseline for demos and quick checks.",
    icon: Zap,
    speed: "Fast",
    privacy: "Local",
  },
  {
    id: "transformers-local",
    name: "Local Transformer",
    description: "Uses your FastAPI backend at 127.0.0.1:8000.",
    icon: Cpu,
    speed: "Medium",
    privacy: "Local API",
  },
  {
    id: "cloud-api",
    name: "Cloud API",
    description: "Placeholder option for remote model workflows.",
    icon: Globe,
    speed: "Fast",
    privacy: "External",
  },
];

export const SentimentAnalysis = ({ comments, onAnalysisComplete }: SentimentAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState("pattern-local");
  const [currentStep, setCurrentStep] = useState("Ready");

  const uniqueComments = [...new Set(comments)];
  const selectedModelInfo = modelOptions.find((model) => model.id === selectedModel);

  const runAnalysis = async () => {
    if (comments.length === 0) {
      toast.error("No comments to analyze");
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setCurrentStep("Initializing model");

    try {
      const results: SentimentResult[] = [];

      for (let i = 0; i < uniqueComments.length; i += 1) {
        const comment = uniqueComments[i];
        setCurrentStep(`Processing row ${i + 1} of ${uniqueComments.length}`);

        await new Promise((resolve) => setTimeout(resolve, 50));

        let sentiment: "positive" | "negative" | "neutral" | "spam";
        let confidence: number;

        if (selectedModel === "transformers-local") {
          ({ sentiment, confidence } = await analyzeWithBackend(comment));
        } else {
          ({ sentiment, confidence } = analyzeSentiment(comment));
        }

        results.push({
          comment,
          sentiment,
          confidence,
          keywords: extractKeywords(comment),
        });

        setProgress(((i + 1) / uniqueComments.length) * 100);
      }

      setCurrentStep("Calculating summary metrics");

      const sentimentCounts = {
        positive: results.filter((result) => result.sentiment === "positive").length,
        negative: results.filter((result) => result.sentiment === "negative").length,
        neutral: results.filter((result) => result.sentiment === "neutral").length,
        spam: results.filter((result) => result.sentiment === "spam").length,
      };

      const satisfactionScore =
        Math.round(
          ((sentimentCounts.positive + 0.5 * sentimentCounts.neutral) / results.length) * 100 * 10,
        ) / 10;
      const averageConfidence = results.reduce((sum, result) => sum + result.confidence, 0) / results.length;

      const analysisResults: AnalysisResults = {
        jobId: `job_${Date.now()}`,
        timestamp: new Date(),
        results,
        totalComments: comments.length,
        uniqueComments: uniqueComments.length,
        duplicatesIgnored: comments.length - uniqueComments.length,
        sentimentCounts,
        satisfactionScore,
        averageConfidence,
        modelUsed: selectedModelInfo?.name || "Unknown",
      };

      setCurrentStep("Analysis complete");
      setProgress(100);

      setTimeout(() => {
        onAnalysisComplete(analysisResults);
        setIsAnalyzing(false);
      }, 350);

      toast.success(`Analysis completed for ${results.length} unique comments`);
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error(error instanceof Error ? error.message : "Analysis failed. Check the selected model and try again.");
      setIsAnalyzing(false);
      setCurrentStep("Ready");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="panel-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-xl">Run Analysis</CardTitle>
          <CardDescription>
            Choose a model and classify the prepared feedback dataset.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-5">
          <div className="grid gap-3">
            <Label>Analysis model</Label>
            <div className="grid gap-3 md:grid-cols-3">
              {modelOptions.map((model) => {
                const Icon = model.icon;
                const active = selectedModel === model.id;

                return (
                  <button
                    key={model.id}
                    type="button"
                    className={`model-option ${active ? "is-selected" : ""}`}
                    onClick={() => setSelectedModel(model.id)}
                    disabled={isAnalyzing}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Icon className="h-5 w-5" />
                      {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="mt-4 text-left">
                      <h3>{model.name}</h3>
                      <p>{model.description}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline">{model.speed}</Badge>
                      <Badge variant="outline">{model.privacy}</Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Alert className="bg-muted/40">
            <Brain className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium text-foreground">{selectedModelInfo?.name}</span>
              <span className="text-muted-foreground"> - {selectedModelInfo?.description}</span>
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border border-border bg-muted/30 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Ready to classify</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {comments.length} total rows, {uniqueComments.length} unique rows,{" "}
                  {comments.length - uniqueComments.length} duplicates ignored.
                </p>
              </div>
              <Button onClick={runAnalysis} disabled={isAnalyzing} size="lg" className="gap-2">
                <Play className="h-4 w-4" />
                {isAnalyzing ? "Analyzing" : "Start Analysis"}
              </Button>
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{currentStep}</span>
                <span className="tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <aside className="space-y-4">
        <Card className="panel-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl">Run Summary</CardTitle>
            <CardDescription>Dataset and execution settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            <div className="summary-row">
              <span>Total comments</span>
              <strong>{comments.length}</strong>
            </div>
            <div className="summary-row">
              <span>Unique comments</span>
              <strong>{uniqueComments.length}</strong>
            </div>
            <div className="summary-row">
              <span>Model</span>
              <strong>{selectedModelInfo?.name}</strong>
            </div>
            <div className="summary-row">
              <span>Privacy</span>
              <strong>{selectedModelInfo?.privacy}</strong>
            </div>
          </CardContent>
        </Card>

        <Card className="panel-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Data handling</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Local modes keep processing on your machine. The transformer option expects the FastAPI backend to be running.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="panel-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-analytics-orange/10 text-analytics-orange">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Expected runtime</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Small CSV files finish quickly. Larger datasets will show progress row by row.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
};
