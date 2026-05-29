import fs from "node:fs";
import path from "node:path";

const outputPath = path.resolve("mixed_sentiment_comments_100.csv");

const aspects = [
  "manual text input",
  "CSV upload",
  "column selection",
  "duplicate detection",
  "sentiment model",
  "spam detection",
  "Hinglish handling",
  "Hindi comments",
  "results dashboard",
  "charts",
  "confidence scores",
  "word cloud",
  "comment filtering",
  "CSV export",
  "backend API",
  "loading progress",
  "mobile layout",
  "error messages",
  "overall workflow",
  "analysis speed",
];

const templates = [
  {
    language: "english",
    comments: [
      "The {aspect} is useful, but it still feels slow with larger datasets.",
      "I like the {aspect}, although the error handling could be clearer.",
      "The {aspect} gives helpful results, but the confidence score is sometimes confusing.",
      "The {aspect} looks clean, but it needs better feedback while processing.",
      "The {aspect} works well for normal comments, but spam examples are not always detected.",
      "The {aspect} is easy to use, but duplicate rows make the summary harder to read.",
      "The {aspect} is a strong feature, but mobile spacing needs improvement.",
      "The {aspect} saves time, though some labels still feel inaccurate.",
    ],
  },
  {
    language: "hinglish",
    comments: [
      "{aspect} useful hai, but large CSV par thoda slow lagta hai.",
      "{aspect} ka design clean hai, lekin error message aur clear hona chahiye.",
      "{aspect} results helpful deta hai, par confidence score kabhi confusing lagta hai.",
      "{aspect} easy to use hai, but spam detection hamesha perfect nahi hai.",
      "{aspect} ka flow achha hai, lekin duplicate comments ka handling improve ho sakta hai.",
      "{aspect} fast lagta hai small data par, but big file me wait zyada hota hai.",
      "{aspect} project ko professional banata hai, par mobile layout thoda tight hai.",
      "{aspect} ka output useful hai, lekin kuch Hindi comments galat classify ho jate hain.",
    ],
  },
  {
    language: "hindi",
    comments: [
      "{aspect} उपयोगी है, लेकिन बड़े डेटा पर थोड़ा धीमा लगता है।",
      "{aspect} अच्छा दिखता है, लेकिन गलती के संदेश और साफ होने चाहिए।",
      "{aspect} मददगार परिणाम देता है, लेकिन confidence score कभी-कभी उलझन पैदा करता है।",
      "{aspect} इस्तेमाल करने में आसान है, लेकिन spam detection हमेशा सही नहीं होता।",
      "{aspect} का flow अच्छा है, लेकिन duplicate comments को और बेहतर संभालना चाहिए।",
      "{aspect} छोटे डेटा पर तेज है, लेकिन बड़ी CSV में इंतजार ज्यादा होता है।",
      "{aspect} प्रोजेक्ट को अच्छा बनाता है, लेकिन mobile layout थोड़ा बेहतर हो सकता है।",
      "{aspect} उपयोगी output देता है, लेकिन कुछ Hindi comments गलत classify हो जाते हैं।",
    ],
  },
];

const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
const rows = [["id", "comment", "label", "language", "aspect"]];

for (let id = 1; id <= 100; id += 1) {
  const group = templates[(id - 1) % templates.length];
  const aspect = aspects[(id - 1) % aspects.length];
  const template = group.comments[Math.floor((id - 1) / templates.length) % group.comments.length];
  rows.push([id, template.replaceAll("{aspect}", aspect), "mixed", group.language, aspect]);
}

fs.writeFileSync(
  outputPath,
  rows.map((row) => row.map(escapeCsv).join(",")).join("\n"),
  "utf8",
);

console.log(`Created ${outputPath} with ${rows.length - 1} mixed comments.`);
