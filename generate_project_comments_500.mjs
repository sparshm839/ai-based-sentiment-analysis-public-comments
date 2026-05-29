import fs from "node:fs";
import path from "node:path";

const outputPath = path.resolve("project_comments_500_multilingual_duplicates.csv");

const aspects = [
  "manual text input",
  "CSV upload",
  "column selection",
  "duplicate detection",
  "sentiment model",
  "spam detection",
  "Hinglish handling",
  "Hindi comments",
  "English comments",
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
];

const sources = ["manual", "csv", "review", "chat", "survey", "test-case"];

const templates = {
  positive: {
    english: [
      "The {aspect} works smoothly and makes the analysis feel reliable.",
      "I like how the {aspect} is clear, fast, and easy to understand.",
      "The {aspect} gives useful output and saves a lot of review time.",
      "Great job on the {aspect}; it feels polished and practical.",
      "The {aspect} is accurate enough for testing real customer feedback.",
      "The {aspect} helps me trust the sentiment results more.",
      "I had a very good experience using the {aspect}.",
      "The {aspect} is simple for beginners and still useful for advanced users.",
    ],
    hinglish: [
      "{aspect} bahut smooth hai, analysis karna easy lagta hai.",
      "Mujhe {aspect} ka flow kaafi clear aur useful laga.",
      "{aspect} mast kaam karta hai, time bhi save hota hai.",
      "{aspect} se results samajhna simple ho gaya.",
      "Project ka {aspect} kaafi professional feel deta hai.",
      "{aspect} fast hai aur user ko confuse nahi karta.",
      "{aspect} ka output mostly accurate aur helpful hai.",
      "{aspect} beginner ke liye bhi easy hai.",
    ],
    hindi: [
      "{aspect} बहुत अच्छा काम करता है और परिणाम साफ दिखते हैं।",
      "{aspect} उपयोग करने में आसान है और समय बचाता है।",
      "{aspect} से विश्लेषण भरोसेमंद लगता है।",
      "{aspect} का इंटरफेस साफ और उपयोगी है।",
      "{aspect} ने पूरे प्रोजेक्ट को बेहतर बना दिया है।",
      "{aspect} तेज है और सही जानकारी देता है।",
      "{aspect} की वजह से फीडबैक समझना आसान हुआ।",
      "{aspect} नए यूजर के लिए भी सरल है।",
    ],
  },
  negative: {
    english: [
      "The {aspect} feels slow and needs clearer feedback.",
      "I found the {aspect} confusing during testing.",
      "The {aspect} did not behave as expected with messy comments.",
      "The {aspect} needs improvement because the result is hard to trust.",
      "The {aspect} sometimes makes the workflow frustrating.",
      "I had trouble using the {aspect} on repeated test runs.",
      "The {aspect} should show better errors when something fails.",
      "The {aspect} feels unfinished compared with the rest of the app.",
    ],
    hinglish: [
      "{aspect} thoda confusing hai, user ko clear guidance chahiye.",
      "{aspect} slow lagta hai jab comments zyada hote hain.",
      "Mujhe {aspect} ka result reliable nahi laga.",
      "{aspect} me error message clear nahi aata.",
      "{aspect} use karte waqt flow break ho jata hai.",
      "{aspect} mobile par properly comfortable nahi laga.",
      "{aspect} ko aur testing ki zarurat hai.",
      "{aspect} ka response kabhi kabhi inconsistent lagta hai.",
    ],
    hindi: [
      "{aspect} थोड़ा धीमा है और सुधार की जरूरत है।",
      "{aspect} इस्तेमाल करते समय उलझन होती है।",
      "{aspect} का परिणाम हमेशा भरोसेमंद नहीं लगता।",
      "{aspect} में गलती आने पर संदेश साफ नहीं होता।",
      "{aspect} बड़े डेटा पर अच्छा अनुभव नहीं देता।",
      "{aspect} की वजह से काम बीच में रुकता हुआ लगता है।",
      "{aspect} को और बेहतर परीक्षण चाहिए।",
      "{aspect} बाकी हिस्सों जितना मजबूत नहीं लगता।",
    ],
  },
  neutral: {
    english: [
      "The {aspect} is available and performs the basic task.",
      "I used the {aspect} once and it worked in an ordinary way.",
      "The {aspect} shows the expected information without any major issue.",
      "The {aspect} is functional, but nothing special stands out.",
      "The {aspect} completes the workflow as expected.",
      "The {aspect} provides standard behavior for a sentiment tool.",
      "The {aspect} is acceptable for normal project testing.",
      "The {aspect} has the required options and basic output.",
    ],
    hinglish: [
      "{aspect} normal kaam karta hai, kuch khas issue nahi mila.",
      "{aspect} theek hai, basic requirement complete ho jati hai.",
      "{aspect} expected tarike se chal raha hai.",
      "{aspect} average hai, na bahut good na bad.",
      "{aspect} ka output simple aur usable hai.",
      "{aspect} project testing ke liye okay hai.",
      "{aspect} me basic options available hain.",
      "{aspect} ka experience neutral laga.",
    ],
    hindi: [
      "{aspect} सामान्य तरीके से काम करता है।",
      "{aspect} में जरूरी विकल्प उपलब्ध हैं।",
      "{aspect} ने अपेक्षित काम पूरा किया।",
      "{aspect} ठीक है, कोई बड़ी समस्या नहीं दिखी।",
      "{aspect} का अनुभव औसत रहा।",
      "{aspect} परीक्षण के लिए उपयोगी है।",
      "{aspect} में बुनियादी जानकारी मिल जाती है।",
      "{aspect} न बहुत अच्छा है न बहुत खराब।",
    ],
  },
  spam: {
    english: [
      "Free sentiment tool premium access for {aspect}, click this link now.",
      "Win cash by reviewing {aspect}, claim your reward today.",
      "Limited offer for {aspect}, send your number for instant bonus.",
      "Earn money daily using {aspect}, register now and get paid.",
      "Cheap promotion for {aspect}, buy followers and boost reviews fast.",
      "Urgent verification for {aspect}, click now before account closes.",
      "Guaranteed profit with {aspect}, message us for secret method.",
      "Get free gift card for {aspect}, share OTP to confirm prize.",
    ],
    hinglish: [
      "{aspect} ke liye free paisa offer, abhi click karo.",
      "{aspect} review karo aur instant cash jeeto, link open karo.",
      "{aspect} bonus claim karne ke liye mobile number bhejo.",
      "{aspect} se daily earning start karo, register now.",
      "{aspect} ka secret hack chahiye to abhi message karo.",
      "{aspect} free upgrade ke liye OTP share karo.",
      "{aspect} par guaranteed income, limited seats jaldi join karo.",
      "{aspect} gift voucher winner, details send karo now.",
    ],
    hindi: [
      "{aspect} के लिए मुफ्त इनाम पाने के लिए अभी लिंक खोलें।",
      "{aspect} पर कैश जीतें, तुरंत अपना नंबर भेजें।",
      "{aspect} बोनस पाने के लिए ओटीपी शेयर करें।",
      "{aspect} से रोज कमाई करें, अभी रजिस्टर करें।",
      "{aspect} का गुप्त तरीका चाहिए तो तुरंत संदेश भेजें।",
      "{aspect} फ्री अपग्रेड पाने के लिए खाता सत्यापित करें।",
      "{aspect} पर गारंटीड पैसा, मौका सीमित है।",
      "{aspect} गिफ्ट कार्ड जीतने के लिए विवरण भेजें।",
    ],
  },
};

const languages = ["english", "hinglish", "hindi"];
const labels = ["positive", "negative", "neutral", "spam"];

const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;

const rows = [["id", "comment", "label", "language", "aspect", "source", "duplicate_group"]];
const seenByLabel = {
  positive: [],
  negative: [],
  neutral: [],
  spam: [],
};

for (let id = 1; id <= 500; id += 1) {
  const label = labels[(id - 1) % labels.length];
  const language = languages[Math.floor((id - 1) / labels.length) % languages.length];
  const aspect = aspects[(id - 1) % aspects.length];
  const source = sources[(id - 1) % sources.length];
  const makeDuplicate = id > 40 && id % 10 === 0;

  let comment;
  let duplicateGroup = "";

  if (makeDuplicate && seenByLabel[label].length > 0) {
    const duplicate = seenByLabel[label][Math.floor(id / 10) % seenByLabel[label].length];
    comment = duplicate.comment;
    duplicateGroup = duplicate.group;
  } else {
    const pool = templates[label][language];
    const template = pool[Math.floor((id - 1) / (labels.length * languages.length)) % pool.length];
    comment = template.replaceAll("{aspect}", aspect);
    duplicateGroup = `unique-${id}`;
    seenByLabel[label].push({ comment, group: duplicateGroup });
  }

  rows.push([id, comment, label, language, aspect, source, duplicateGroup]);
}

fs.writeFileSync(
  outputPath,
  rows.map((row) => row.map(escapeCsv).join(",")).join("\n"),
  "utf8",
);

console.log(`Created ${outputPath} with ${rows.length - 1} comments.`);
