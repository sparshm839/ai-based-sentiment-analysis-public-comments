import fs from "node:fs";
import path from "node:path";

const outputPath = path.resolve("sony_wh1000xm5_comments_500.csv");
const product = "Sony WH-1000XM5";

const sources = [
  "amazon_review",
  "reddit_comment",
  "support_ticket",
  "youtube_comment",
  "twitter_post",
  "survey",
  "store_review",
  "app_review",
];

const positive = [
  "The noise cancellation is honestly the best part of these headphones. I use them on the metro every day and the cabin noise almost disappears.",
  "Battery life has been excellent for me. I charge them maybe twice a week even with daily office use.",
  "The sound is warm and detailed without feeling harsh. Podcasts, jazz, and movie soundtracks all sound clean.",
  "These are the first headphones that actually help me focus in a noisy shared workspace.",
  "The ear cups feel light and comfortable during long coding sessions. I can wear them for three or four hours without pressure.",
  "Multipoint pairing works better than I expected. Switching between my laptop and phone is almost seamless.",
  "The Sony Headphones app gives enough control without feeling too complicated.",
  "Call quality is much clearer than my older headphones. My coworkers stopped asking me to repeat myself.",
  "The design looks minimal and premium. I like that they do not scream gamer or studio gear.",
  "The quick attention mode is surprisingly useful when someone walks up to my desk.",
  "ANC plus low volume music is perfect for studying. It blocks the fan, traffic, and most hallway noise.",
  "The case is slim enough to fit in my backpack, which matters because I travel with them a lot.",
  "LDAC sounds great with my Android phone. I can hear more detail in tracks I know well.",
  "The touch controls are responsive once you get used to them.",
  "I bought these for flights and they made a six hour trip feel much less tiring.",
  "The microphone is good enough for Zoom calls, and the background noise rejection surprised me.",
  "I love how light they feel compared with older over-ear headphones.",
  "The auto pause when I remove them works reliably for me.",
  "The bass is controlled and not muddy. It has weight without drowning the vocals.",
  "They are expensive, but I use them every day, so the value makes sense to me.",
];

const negative = [
  "The price is hard to justify. They sound good, but not twice as good as cheaper headphones.",
  "The headband creates a hot spot after about an hour. I expected better comfort at this price.",
  "The ear cups get warm quickly in summer, especially during long meetings.",
  "The touch controls are too sensitive. I keep skipping songs when adjusting the fit.",
  "The case feels less protective than I expected for such an expensive product.",
  "I miss the folding design from the older XM4. These take more space in my bag.",
  "The app randomly disconnects from the headphones, even though Bluetooth audio keeps playing.",
  "Call quality is still not great outdoors when there is wind.",
  "The ANC is strong, but voices still come through more than I hoped.",
  "The plastic creaks a little when I adjust the ear cups. It makes them feel less premium.",
  "They clamp too loosely for walking fast. I would not use them at the gym.",
  "The speak-to-chat feature triggers by accident when I hum along to songs.",
  "Firmware updates take longer than they should and the app does not explain what changed.",
  "The sound out of the box felt too bass heavy for me.",
  "I had Bluetooth dropouts on Windows until I removed and paired them again.",
  "The right ear sensor paused music randomly for a few days.",
  "The included cable is short and feels cheap.",
  "They are not water resistant, which is disappointing for travel headphones.",
  "The microphone picks up keyboard noise more than I expected.",
  "I returned them because the comfort did not work with my glasses.",
];

const neutral = [
  "The headphones work as expected. I use them mostly for music and video calls.",
  "Sound quality is good, but I had to adjust the EQ before I liked it.",
  "The battery lasts long enough for my normal weekly use.",
  "The app has many settings, and I only use a few of them.",
  "The ANC blocks steady noise better than random voices.",
  "Pairing was simple on my phone and a little slower on my laptop.",
  "The build feels light, which can be good or bad depending on what you prefer.",
  "The case is fine, although it is not very rigid.",
  "The headphones are comfortable for short sessions and average for longer ones.",
  "I use them mostly at home, so the travel features are not very important to me.",
  "The touch controls work, but they took a few days to learn.",
  "The microphone is acceptable for meetings in a quiet room.",
  "The sound profile is smooth and safe rather than exciting.",
  "I have not noticed any major connection issues so far.",
  "The design is simple and blends in.",
  "Charging speed is normal for this category.",
  "The included accessories are basic but enough.",
  "Noise cancellation is useful, especially with air conditioners and fans.",
  "I would call them a solid pair of premium headphones.",
  "They are good headphones, but the experience depends on what you value most.",
];

const mixed = [
  "The ANC is excellent, but the comfort is only okay for my head shape.",
  "I love the sound, but I really wish Sony had kept the foldable hinge.",
  "Battery life is amazing, but the app feels cluttered.",
  "The headphones are great for flights, but they get warm after a long movie.",
  "Call quality is good indoors, but outdoor wind still ruins meetings.",
  "The bass is enjoyable, but I had to reduce it in the EQ.",
  "They feel premium in daily use, but the case does not feel very protective.",
  "Multipoint is convenient, but switching audio sources sometimes lags for a second.",
  "The touch controls are smooth, but accidental touches happen too often.",
  "The sound is clean and relaxing, but some people may find it too soft.",
  "The microphone is better than my old headset, but not as good as a dedicated mic.",
  "They are comfortable without glasses, but not great when I wear thick frames.",
  "The noise cancellation is worth it, but the price still hurts.",
  "I like the minimalist look, but fingerprints show up easily on the black version.",
  "The app customization is useful, but first-time setup took longer than expected.",
  "Great for office work, less ideal for workouts because they shift around.",
  "They connect quickly to my phone, but Windows pairing was annoying.",
  "Music sounds rich, but gaming latency is noticeable.",
  "The auto pause feature is useful, but sometimes it is too aggressive.",
  "They are probably the best travel headphones I have owned, but I still miss physical buttons.",
];

const support = [
  "My XM5 keeps disconnecting from my Dell laptop after ten minutes. Phone connection is stable.",
  "The left ear cup started making a faint clicking sound when noise cancellation is on.",
  "I need help turning off speak-to-chat permanently. It keeps enabling itself after updates.",
  "The headphones are paired, but the Sony app cannot find them.",
  "After the latest firmware update, multipoint connection became unreliable.",
  "The ear detection sensor pauses music even when the headphones are still on my head.",
  "Can you provide replacement ear pads for the WH-1000XM5?",
  "The battery percentage jumps from 40 to 10 very quickly.",
  "My headphones will not charge past 80 percent even with the original cable.",
  "Noise cancellation suddenly sounds weaker than it did last month.",
  "The right touch panel does not respond to swipe gestures anymore.",
  "I hear a low hiss in the left ear when no music is playing.",
  "The microphone is not detected in Microsoft Teams.",
  "The headphones connect to two devices, but audio only plays from the wrong one.",
  "The power button feels stuck and sometimes needs two presses.",
  "The app shows connected, but the headphones say Bluetooth disconnected.",
  "Can I disable the voice prompts? They are too loud at night.",
  "The headphones keep switching ambient mode on by themselves.",
  "The charging LED does not turn on anymore.",
  "I need warranty help because the headband cushion is separating.",
];

const shipping = [
  "The box arrived slightly crushed, but the headphones were safe inside.",
  "Delivery was two days late, which was frustrating because this was a birthday gift.",
  "The product was sealed properly and looked brand new.",
  "The package was missing the USB-C cable.",
  "I received the silver color instead of black.",
  "Shipping was fast, and setup took less than five minutes.",
  "The courier left the box in the rain, but thankfully the case was dry.",
  "The outer box had no extra padding, which worried me.",
  "The headphones arrived fully intact and charged to about 60 percent.",
  "Return pickup was smooth after I decided the fit was not for me.",
  "The invoice had the wrong product name, but the headphones were correct.",
  "I ordered during a sale and still received it earlier than expected.",
  "The seal looked opened, so I requested a replacement.",
  "The package included everything listed on the product page.",
  "The delivery tracking did not update for a day, then it arrived suddenly.",
  "The case had a small mark when I opened the box.",
  "The replacement unit arrived quickly and works fine.",
  "Packaging was simple but premium enough.",
  "I wish the seller used better protective wrapping.",
  "No issues with delivery or setup.",
];

const featureRequests = [
  "Sony should add a stronger wind reduction mode for outdoor calls.",
  "I wish the app had a simpler beginner mode with fewer toggles.",
  "Please bring back the folding hinge in the next version.",
  "A small physical button for volume would be better than touch gestures.",
  "I would like a custom ANC slider for different environments.",
  "The app should show battery health over time.",
  "Please add a gaming low-latency mode.",
  "I wish the headphones had basic water resistance.",
  "There should be a setting to reduce voice prompt volume.",
  "Sony should include a stronger travel case.",
  "A replaceable headband cushion would make these last longer.",
  "Please improve Teams and Zoom microphone compatibility on Windows.",
  "I want more EQ presets for speech, movies, and classical music.",
  "It would be useful to save different profiles for office and travel.",
  "The adaptive sound control should be easier to tune manually.",
  "Please add a find-my-headphones feature in the app.",
  "I wish the headphones supported USB-C audio directly.",
  "The next model should have better ventilation in the ear pads.",
  "Please make the touch controls less sensitive.",
  "A quick mute gesture for calls would be very helpful.",
];

const comparison = [
  "Compared with the Bose QC45, the XM5 has stronger ANC but feels warmer around my ears.",
  "I prefer the XM5 sound over AirPods Max because it is lighter and less tiring.",
  "The XM4 folded better for travel, but the XM5 sounds cleaner to me.",
  "Bose still wins on comfort for my head, but Sony wins on features.",
  "The AirPods Pro are easier for calls, but the XM5 blocks more airplane noise.",
  "The XM5 is better than my old JBL headset in every category except price.",
  "I tried both XM4 and XM5, and the XM5 microphone is noticeably better.",
  "The Sennheiser Momentum sounds more lively, but Sony has better ANC.",
  "I like Bose buttons more than Sony touch controls.",
  "The XM5 feels lighter than AirPods Max, which matters on long flights.",
  "I upgraded from XM3 and the call quality improvement is obvious.",
  "Compared to cheap ANC headphones, these handle low-frequency noise much better.",
  "The XM4 case felt more compact because the headphones folded.",
  "For Android users, LDAC makes the XM5 more appealing than some competitors.",
  "I still think Bose is more comfortable, but Sony gives more customization.",
  "The XM5 beats my old Beats headphones for clarity and ANC.",
  "AirPods Max has nicer materials, but the XM5 is easier to carry.",
  "The XM5 app is more detailed than Bose, maybe too detailed.",
  "I kept the XM5 over the Momentum because I travel a lot.",
  "The XM4 was already great, so the upgrade is nice but not essential.",
];

const shortComments = [
  "Amazing ANC.",
  "Too expensive.",
  "Comfort is okay.",
  "Great for flights.",
  "App is confusing.",
  "Battery is excellent.",
  "Not good with glasses.",
  "Sound is smooth.",
  "Touch controls annoy me.",
  "Worth it on sale.",
  "Case feels weak.",
  "Mic is decent.",
  "Very light.",
  "Gets warm.",
  "Solid headphones.",
  "Love the multipoint.",
  "Voices still leak in.",
  "Good for studying.",
  "Returned mine.",
  "No regrets.",
];

const longComments = [
  "I bought the Sony WH-1000XM5 mainly for office work, and they have changed how I handle noisy days. The ANC removes the constant hum from the AC and nearby conversations become much softer. The sound is pleasant rather than aggressive, which is exactly what I wanted for long listening sessions.",
  "My experience has been mixed. The headphones sound great and battery life is excellent, but the comfort is not perfect for me. After about ninety minutes the top of my head starts feeling pressure. I still use them daily, but I take short breaks between meetings.",
  "The XM5 is a strong travel product. I used it on a train, in an airport, and during a flight, and the reduction in engine noise was obvious. The only thing I dislike is the non-folding design because it takes more bag space than my older headphones.",
  "I expected better call quality outdoors. Indoors my voice is clear enough for meetings, but wind and traffic still confuse the microphones. For music and ANC these are excellent, but I would not buy them only for calls.",
  "The app has a lot of control, maybe too much. I like adjusting EQ and ambient sound, but adaptive sound control changed modes when I did not want it to. After disabling a few automatic features, the headphones became much more predictable.",
  "These headphones feel like a product made for frequent use. They are light, quick to pair, and the battery lasts long enough that I do not think about charging. The sound signature is relaxed, so they are easy to listen to while working.",
  "I returned the XM5 because of comfort with glasses. The ear pads are soft, but the seal broke around my frames and ANC became weaker. Without glasses they were impressive, so this is probably more about fit than quality.",
  "The touch controls are the only part I still do not trust. Swiping for volume works most of the time, but accidental touches happen when I adjust the headphones. Physical buttons would make this product feel more reliable.",
  "For students, these are excellent if the budget allows it. I use them in the library, in my hostel room, and while commuting. The ANC does not erase everything, but it lowers the world enough that I can focus.",
  "I upgraded from cheap noise cancelling headphones and the difference is huge. Low rumble, fans, and bus noise are handled much better. I still think the price is high, but the daily comfort and focus improvement make it easier to accept.",
];

const spam = [
  "Congratulations you won free Sony headphones click now to claim prize.",
  "Cheap XM5 headphones available today DM me for best deal.",
  "Visit my profile for free giveaway and gift cards.",
  "Buy crypto now and earn money overnight with headphone discount.",
  "Limited offer free iPhone and Sony headset claim now.",
  "Follow for follow and win free electronics today.",
  "Earn 5000 weekly from home click this link now.",
  "Best deals cheap followers free prizes message me now.",
  "Free laptop free headphones free voucher click here.",
  "Work from home profit secret buy now limited time.",
];

const groups = [
  ["positive", "praise", positive],
  ["negative", "complaint", negative],
  ["neutral", "neutral_review", neutral],
  ["mixed", "mixed_review", mixed],
  ["neutral", "support_issue", support],
  ["neutral", "shipping_delivery", shipping],
  ["neutral", "feature_request", featureRequests],
  ["mixed", "comparison", comparison],
  ["neutral", "short_comment", shortComments],
  ["mixed", "long_review", longComments],
  ["spam", "spam_noise", spam],
];

const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
const rows = [["id", "product", "source", "expected_label", "comment_type", "comment"]];

const usageContexts = [
  "during my morning commute",
  "while working from a busy cafe",
  "on a weekend train ride",
  "during back-to-back office calls",
  "while studying in the library",
  "on a short domestic flight",
  "while editing videos at night",
  "during a noisy family gathering",
  "while walking near traffic",
  "during an online class",
  "while pairing with my Windows laptop",
  "after switching from earbuds",
  "while listening to podcasts",
  "during a long playlist session",
  "after using them for two weeks",
  "after a month of daily use",
  "while travelling with a backpack",
  "during gym warmups",
  "while taking calls from home",
  "after comparing them with my older headset",
];

const humanDetails = [
  "I would still mention it to someone before they buy.",
  "It is the kind of thing you notice only after regular use.",
  "My opinion may depend on fit, but this was my honest experience.",
  "I did not expect that detail to matter as much as it did.",
  "For my routine, this made a noticeable difference.",
  "It may not bother everyone, but it stood out to me.",
  "I kept noticing it during normal everyday use.",
  "That small detail changed how I felt about the headphones.",
  "I wrote this after using them outside the first-day excitement.",
  "This is not a deal breaker, but it is worth knowing.",
  "A friend tried them too and noticed the same thing.",
  "This became clearer after I used them for work and music.",
  "I would rate that part differently depending on the situation.",
  "It feels like something Sony could improve in the next version.",
  "I noticed it most when switching between my phone and laptop.",
  "It was more obvious during longer sessions than short tests.",
  "The experience felt different at home compared with outdoors.",
  "I would not call it perfect, but it is very noticeable.",
  "This is the part I would talk about in a real recommendation.",
  "It mattered more to me than the spec sheet suggested.",
];

const setups = [
  "My main device was an Android phone.",
  "I tested it mostly with a Windows laptop.",
  "Most of my listening was through Spotify.",
  "I used it with Teams and YouTube on the same day.",
  "My room has a loud ceiling fan.",
  "I usually keep ANC on the strongest setting.",
  "I used the default EQ for this impression.",
  "I tried a custom EQ before writing this.",
  "I used it with glasses on.",
  "I tested it without the carrying case nearby.",
  "Most listening was at low volume.",
  "I used it during both calls and music playback.",
  "I paired it with two devices at once.",
  "I used it in a quiet room first, then outside.",
  "I compared it with my older over-ear headphones.",
  "I kept adaptive sound control enabled.",
  "I turned off speak-to-chat after setup.",
  "I used the black color version.",
  "I tried it with the included cable once.",
  "I mainly used Bluetooth mode.",
  "My playlist had podcasts, pop, and film music.",
  "The review is based on normal daily use.",
  "I used it for both work and travel.",
  "I tested it during a full battery cycle.",
  "I used it after the latest app setup.",
];

const spamTails = [
  "Only today, message fast.",
  "Offer closes soon, do not miss it.",
  "Reply now for instant details.",
  "Limited stock available.",
  "Use secret code XM5FREE.",
  "No verification needed.",
  "Send your number for the link.",
  "Claim before midnight.",
  "Guaranteed reward for first users.",
  "Act fast before the deal disappears.",
];

const makeUniqueComment = (base, label, index) => {
  if (label === "spam") {
    return `${base} ${spamTails[index % spamTails.length]} Batch code XM5-${index + 1000}.`;
  }

  const context = usageContexts[index % usageContexts.length];
  const detail = humanDetails[Math.floor(index / usageContexts.length) % humanDetails.length];
  const setup = setups[index % setups.length];
  return `${base} I noticed this ${context}. ${detail} ${setup}`;
};

for (let i = 1; i <= 500; i += 1) {
  const [label, type, pool] = groups[(i - 1) % groups.length];
  const baseComment = pool[Math.floor((i - 1) / groups.length) % pool.length];
  const comment = makeUniqueComment(baseComment, label, i - 1);
  const source = sources[(i - 1) % sources.length];
  rows.push([i, product, source, label, type, comment]);
}

fs.writeFileSync(
  outputPath,
  rows.map((row) => row.map(escapeCsv).join(",")).join("\n"),
  "utf8",
);

console.log(`Created ${outputPath} with 500 data rows.`);
