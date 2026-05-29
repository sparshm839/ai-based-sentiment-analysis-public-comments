import fs from "node:fs";
import path from "node:path";

const outputPath = path.resolve("sentiment_test_500.csv");

const topics = [
  "Healthcare",
  "Banking",
  "Education",
  "Ecommerce",
  "Travel",
  "Food",
  "Government",
  "Mobile App",
  "Customer Support",
  "Hospitality",
];

const sources = ["survey", "review", "email", "chat", "social", "ticket"];

const positive = [
  "The staff were helpful, patient, and solved my issue faster than expected.",
  "I had a smooth experience from start to finish and would recommend this service.",
  "The new process is clear, quick, and much easier to follow than before.",
  "The support team listened carefully and gave me a practical solution.",
  "Everything worked perfectly and the quality was better than I expected.",
  "The interface is clean, responsive, and simple enough for first-time users.",
  "The team handled my request professionally and kept me updated throughout.",
  "I am satisfied with the service because it saved me time and effort.",
  "The experience felt reliable, organized, and genuinely customer focused.",
  "The result was accurate, timely, and better than my previous experience.",
];

const negative = [
  "The waiting time was too long and nobody explained the delay properly.",
  "I found the process confusing, slow, and frustrating at every step.",
  "The service was poor and the staff did not seem interested in helping.",
  "The app crashed repeatedly and I lost my progress twice.",
  "The charges were unclear and I felt the final bill was not transparent.",
  "My complaint was ignored for several days and the response was not useful.",
  "The instructions were complicated and the form kept showing errors.",
  "The quality was disappointing and did not match what was promised.",
  "I had to repeat the same information multiple times, which was irritating.",
  "The overall experience was stressful and I would not use this again.",
];

const neutral = [
  "The service was completed as expected without any major issue.",
  "I used the system once and it worked in a normal way.",
  "The information was available, although I had to search for it.",
  "The appointment was scheduled and completed on the selected date.",
  "The product arrived in standard packaging with all listed items included.",
  "The website contains the required options and basic instructions.",
  "The representative answered my question and closed the request.",
  "The process took an average amount of time compared with similar services.",
  "The dashboard shows the main details and the available status updates.",
  "The experience was acceptable but nothing stood out as excellent.",
];

const mixed = [
  "The staff were friendly, but the waiting time was much longer than expected.",
  "The app looks good, although several features still feel incomplete.",
  "The product quality is nice, but delivery updates were not accurate.",
  "The support team solved the issue, but I had to contact them three times.",
  "The price is reasonable, but the checkout flow is confusing.",
  "The room was clean, but the noise at night made it difficult to rest.",
  "The doctor explained the treatment well, but the billing process was unclear.",
  "The course content is useful, but the platform loads slowly during tests.",
  "The food tasted good, but the packaging leaked during delivery.",
  "The service improved recently, but some old problems still remain.",
];

const spam = [
  "CLICK NOW limited offer free prize claim reward today",
  "Buy followers fast cheap guaranteed results visit link now",
  "Congratulations you won a gift card send details immediately",
  "Work from home earn money daily no experience required",
  "Free loan approval instant cash message us now",
  "Amazing deal deal deal lowest price limited stock",
  "Promo code jackpot bonus winner register today",
  "Urgent account verification required click this link",
  "Best crypto profit secret double your money fast",
  "Cheap medicine online discount pills no prescription",
];

const shortText = [
  "Good",
  "Bad",
  "Okay",
  "Slow",
  "Helpful",
  "Confusing",
  "Average",
  "Excellent",
  "Poor",
  "Fine",
];

const longText = [
  "I appreciate that the service eventually solved my problem, but the journey could be improved. The first contact gave incomplete information, the second person understood the issue better, and the final response was helpful. Overall I am satisfied, but the handoff between teams needs attention.",
  "My experience was negative because the system made a simple task feel difficult. I could not find the correct option, the error message was vague, and the help page did not answer my question. A clearer workflow would make a major difference.",
  "The service is usable for basic needs, but it does not feel polished. Most important features are available, yet some labels are unclear and the page layout can be hard to scan. I would call it acceptable, not impressive.",
  "The staff member who handled my case was excellent. They explained the next steps, checked whether I understood the details, and followed up after the issue was resolved. That made the whole experience feel professional and trustworthy.",
  "The product arrived late and the tracking page did not update for two days. When it finally arrived, the item was in good condition, so the final outcome was fine. The communication during delivery was the weakest part.",
];

const pools = [
  ["positive", positive],
  ["negative", negative],
  ["neutral", neutral],
  ["mixed", mixed],
  ["spam", spam],
  ["short", shortText],
  ["long", longText],
];

const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;

const rows = [["id", "source", "topic", "expected_sentiment", "comment"]];

for (let i = 1; i <= 500; i += 1) {
  const [label, pool] = pools[(i - 1) % pools.length];
  const comment = pool[Math.floor((i - 1) / pools.length) % pool.length];
  const topic = topics[(i - 1) % topics.length];
  const source = sources[(i - 1) % sources.length];
  rows.push([i, source, topic, label, comment]);
}

fs.writeFileSync(
  outputPath,
  rows.map((row) => row.map(escapeCsv).join(",")).join("\n"),
  "utf8",
);

console.log(`Created ${outputPath} with 500 data rows.`);
