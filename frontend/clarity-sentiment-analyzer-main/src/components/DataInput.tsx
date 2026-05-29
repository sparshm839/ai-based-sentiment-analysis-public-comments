import { useCallback, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Play,
  RefreshCw,
  Upload,
} from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";

interface ParsedData {
  comments: string[];
  rawCount: number;
  uniqueCount: number;
  duplicateCount: number;
  singleTokenWarning: boolean;
  singleTokenPercentage: number;
}

interface DataInputProps {
  onDataParsed: (data: ParsedData) => void;
  onConfirmAnalysis: (data: ParsedData) => void;
}

const demoData = [
  "The healthcare system needs significant improvement in patient care quality.",
  "Waiting times at the emergency department are extremely long and frustrating.",
  "The staff was very professional and caring during my treatment.",
  "Medical bills are too expensive and not transparent enough.",
  "The new electronic health records system is much more efficient.",
  "Communication between doctors and nurses could be better coordinated.",
  "The hospital facilities are clean and well-maintained overall.",
  "Appointment scheduling system is difficult to navigate and use.",
  "The pharmacy staff provided excellent customer service and support.",
  "More specialists are needed to reduce waiting times significantly.",
];

const EmptyPreview = () => (
  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-6 text-center">
    <FileText className="h-8 w-8 text-muted-foreground" />
    <h3 className="mt-4 text-base font-semibold text-foreground">No dataset parsed yet</h3>
    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
      Paste comments or upload a CSV, then parse the data to review the rows before analysis.
    </p>
  </div>
);

const getCommentColumnScore = (header: string) => {
  const normalized = header.trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (normalized === "comment") return 100;
  if (normalized === "comments") return 95;
  if (normalized === "review") return 90;
  if (normalized === "feedback") return 88;
  if (normalized === "text") return 86;
  if (normalized === "message") return 84;
  if (normalized === "opinion") return 82;
  if (normalized.endsWith("_comment") || normalized.endsWith("_comments")) return 75;
  if (normalized.includes("comment") && !normalized.includes("type")) return 60;
  if (/feedback|review|message|opinion|text/.test(normalized) && !normalized.includes("type")) return 55;

  return 0;
};

export const DataInput = ({ onDataParsed, onConfirmAnalysis }: DataInputProps) => {
  const [activeTab, setActiveTab] = useState("paste");
  const [textInput, setTextInput] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState("");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [useDemo, setUseDemo] = useState(false);
  const [treatAsSingleTokens, setTreatAsSingleTokens] = useState(false);

  const processTextInput = useCallback((text: string) => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      throw new Error("No valid comments found in input");
    }

    const singleTokenLines = lines.filter(
      (line) => line.length <= 3 || line.split(/\s+/).length === 1,
    );
    const singleTokenPercentage = (singleTokenLines.length / lines.length) * 100;
    const uniqueComments = [...new Set(lines)];

    return {
      comments: lines,
      rawCount: lines.length,
      uniqueCount: uniqueComments.length,
      duplicateCount: lines.length - uniqueComments.length,
      singleTokenWarning: singleTokenPercentage > 40,
      singleTokenPercentage,
    };
  }, []);

  const setParsed = (data: ParsedData) => {
    setParsedData(data);
    onDataParsed(data);
  };

  const handleTextParse = () => {
    try {
      const inputText = useDemo ? demoData.join("\n") : textInput;

      if (useDemo) {
        setTextInput(inputText);
      }

      if (!inputText.trim()) {
        toast.error("Please enter text to analyze");
        return;
      }

      const parsed = processTextInput(inputText);
      setParsed(parsed);
      toast.success(`Parsed ${parsed.rawCount} comments`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse text input");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setCsvFile(file);
    setParsedData(null);
    setSelectedColumn("");

    Papa.parse(file, {
      header: true,
      preview: 5,
      complete: (results) => {
        const firstRow = results.data[0] as Record<string, unknown> | undefined;
        const headers = firstRow ? Object.keys(firstRow) : [];
        setCsvHeaders(headers);

        const commentColumns = headers
          .map((header) => ({ header, score: getCommentColumnScore(header) }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score);

        if (commentColumns.length > 0) {
          setSelectedColumn(commentColumns[0].header);
        }

        toast.success(`CSV uploaded with ${headers.length} columns detected`);
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  const handleCsvParse = () => {
    if (!csvFile || !selectedColumn) {
      toast.error("Please select a CSV file and column");
      return;
    }

    Papa.parse(csvFile, {
      header: true,
      complete: (results) => {
        try {
          const comments = results.data
            .map((row: any) => row[selectedColumn])
            .filter((comment: string) => comment && comment.trim().length > 0)
            .map((comment: string) => comment.trim());

          if (comments.length === 0) {
            throw new Error("No valid comments found in selected column");
          }

          const parsed = processTextInput(comments.join("\n"));
          setParsed(parsed);
          toast.success(`Parsed ${parsed.rawCount} comments from CSV`);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to parse CSV data");
        }
      },
      error: (error) => {
        toast.error(`Failed to process CSV: ${error.message}`);
      },
    });
  };

  const handleConfirm = () => {
    if (!parsedData) return;

    const finalData = { ...parsedData };
    if (parsedData.singleTokenWarning && !treatAsSingleTokens) {
      finalData.singleTokenWarning = false;
    }

    onConfirmAnalysis(finalData);
    toast.success("Analysis started");
  };

  const handleReset = () => {
    setTextInput("");
    setCsvFile(null);
    setCsvHeaders([]);
    setSelectedColumn("");
    setParsedData(null);
    setTreatAsSingleTokens(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="panel-card">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-xl">Prepare Dataset</CardTitle>
              <CardDescription className="mt-1">
                Add comments one per line, or select a CSV column that contains feedback text.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
              <Switch id="demo-mode" checked={useDemo} onCheckedChange={setUseDemo} />
              <Label htmlFor="demo-mode" className="text-sm">
                Demo data
              </Label>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
            <TabsList className="grid w-full grid-cols-2 bg-muted">
              <TabsTrigger value="paste" className="gap-2">
                <FileText className="h-4 w-4" />
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="csv" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload CSV
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-input">Comments</Label>
                <Textarea
                  id="text-input"
                  placeholder="Paste each comment on a separate line..."
                  value={textInput}
                  onChange={(event) => setTextInput(event.target.value)}
                  className="min-h-[320px] resize-y bg-background font-mono text-sm leading-6"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleTextParse} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Parse Text
                </Button>
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="csv" className="space-y-4">
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-background text-primary">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="csv-upload">CSV file</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload a CSV and choose the column that contains the comments.
                    </p>
                  </div>
                  <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="max-w-sm" />
                </div>
              </div>

              {csvHeaders.length > 0 && (
                <div className="space-y-2">
                  <Label>Comment column</Label>
                  <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Choose a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button onClick={handleCsvParse} disabled={!csvFile || !selectedColumn} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Parse CSV
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <aside className="space-y-4">
        <Card className="panel-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl">Dataset Review</CardTitle>
            <CardDescription>Confirm the parsed rows before the model runs.</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            {!parsedData ? (
              <EmptyPreview />
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="metric-tile">
                    <span>{parsedData.rawCount}</span>
                    <small>Total</small>
                  </div>
                  <div className="metric-tile">
                    <span>{parsedData.uniqueCount}</span>
                    <small>Unique</small>
                  </div>
                  <div className="metric-tile">
                    <span>{parsedData.duplicateCount}</span>
                    <small>Duplicates</small>
                  </div>
                </div>

                {parsedData.singleTokenWarning && (
                  <Alert className="border-analytics-orange/30 bg-analytics-orange/10">
                    <AlertTriangle className="h-4 w-4 text-analytics-orange" />
                    <AlertDescription>
                      <p className="text-sm">
                        {parsedData.singleTokenPercentage.toFixed(1)}% of rows look like single words.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Switch
                          id="treat-as-tokens"
                          checked={treatAsSingleTokens}
                          onCheckedChange={setTreatAsSingleTokens}
                        />
                        <Label htmlFor="treat-as-tokens" className="text-sm">
                          Treat as keyword-only input
                        </Label>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label>Sample rows</Label>
                    <Badge variant="outline">{Math.min(parsedData.comments.length, 8)} shown</Badge>
                  </div>
                  <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-3">
                    {parsedData.comments.slice(0, 8).map((comment, index) => (
                      <div key={`${comment}-${index}`} className="preview-row">
                        <span>{index + 1}</span>
                        <p>{comment}</p>
                      </div>
                    ))}
                    {parsedData.comments.length > 8 && (
                      <p className="px-2 pt-1 text-xs text-muted-foreground">
                        {parsedData.comments.length - 8} more rows are ready for analysis.
                      </p>
                    )}
                  </div>
                </div>

                <Button onClick={handleConfirm} size="lg" className="w-full gap-2">
                  <Play className="h-4 w-4" />
                  Confirm and Analyze
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-analytics-green" />
                  Data stays in your current project workflow.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
};
