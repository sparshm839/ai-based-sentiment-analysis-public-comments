import asyncio
import logging
import re
from functools import lru_cache
from threading import Lock
from typing import Any, Optional, cast

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    import torch
except Exception:
    torch = None

try:
    from transformers import pipeline
except Exception:
    pipeline = None


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sentiment-api")

app = FastAPI(title="Multilingual Sentiment and Spam Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SENTIMENT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"
SPAM_MODEL = "nahiar/spam-detection-xlm-roberta-v3"
MODEL_CACHE_DIR = "./model_cache"
SPAM_THRESHOLD = 0.70


class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


class ModelState:
    def __init__(self, name: str, task: str):
        self.name = name
        self.task = task
        self.pipeline = None
        self.loaded = False
        self.loading = False
        self.error: Optional[str] = None
        self.device = -1
        self.lock = Lock()
        self.inference_lock = Lock()


spam_state = ModelState(SPAM_MODEL, "text-classification")
sentiment_state = ModelState(SENTIMENT_MODEL, "sentiment-analysis")


POSITIVE_WORDS = {
    "good", "great", "excellent", "amazing", "wonderful", "fantastic",
    "perfect", "love", "best", "awesome", "helpful", "professional",
    "caring", "efficient", "clean", "friendly", "satisfied", "pleased",
    "happy", "outstanding", "impressive", "quality", "reliable",
    "comfortable", "convenient", "smooth", "easy", "solved", "recommend",
    "clear", "quick", "accurate", "timely", "trustworthy", "strong",
    "better", "useful", "premium", "pleasant", "relaxing",
}

NEGATIVE_WORDS = {
    "bad", "terrible", "awful", "horrible", "worst", "hate",
    "disappointing", "poor", "inadequate", "frustrating", "annoying",
    "slow", "expensive", "difficult", "complicated", "confusing",
    "unclear", "unprofessional", "rude", "unhelpful", "broken", "failed",
    "problem", "issue", "complaint", "concern", "ignored", "stressful",
    "crashed", "delay", "late", "errors", "disconnecting", "disconnects",
    "unreliable", "weaker", "missing", "wrong", "stuck", "hiss", "hot",
    "warm", "sensitive", "pressure", "returned", "dropouts", "dropout",
    "creaks", "weak", "lag", "lags",
}

NEUTRAL_PHRASES = [
    "as expected", "mostly for", "normal", "average", "acceptable",
    "basic", "solid pair", "depends on", "nothing special", "fine",
    "not very important", "only use a few", "took a few days", "so far",
    "good or bad", "standard", "decent", "works", "worked", "usable",
    "not perfect", "only okay", "mixed", "some features", "while others",
    "nothing stood out", "expected most of the time",
]

CONTRAST_WORDS = {"but", "although", "though", "however", "while", "yet"}

FALLBACK_SPAM_PHRASES = (
    "click here", "free gift", "gift card", "limited offer", "dm me",
    "follow me", "subscribe", "get rich", "discount code", "buy cheap",
    "earn money", "make money fast", "work from home", "act now",
    "claim now", "click now", "free giveaway", "cheap followers",
    "buy crypto", "rich overnight", "whatsapp me", "telegram channel",
    "paise kamao", "ghar baithe", "free recharge", "muft", "jeeto",
    "\u0932\u093f\u0902\u0915", "\u092b\u094d\u0930\u0940",
    "\u0911\u092b\u0930", "\u0907\u0928\u093e\u092e",
    "\u092a\u0948\u0938\u0947 \u0915\u092e\u093e\u090f\u0902",
    "\u0918\u0930 \u092c\u0948\u0920\u0947",
)

FALLBACK_SPAM_TERMS = {
    "earn", "cash", "money", "prize", "giveaway", "followers", "cheap",
    "instantly", "crypto", "rich", "congratulations", "won", "free",
    "iphone", "click", "dm", "buy", "offer", "recharge", "whatsapp",
    "telegram", "paise", "kamao", "muft", "jeeto",
}

REVIEW_TERMS = {
    "quality", "delivery", "product", "phone", "packaging", "value",
    "beginner", "beginners", "easy", "smooth", "premium", "feel",
    "battery", "camera", "screen", "display", "sound", "noise",
    "comfortable", "fit", "fast", "slow", "excellent", "great",
    "good", "bad", "works", "worked", "use", "using", "overall",
    "bahut", "hai", "yeh", "achha", "accha", "bekar",
}

HINDI_REVIEW_TERMS = (
    "\u0905\u091a\u094d\u091b\u093e",  # अच्छा
    "\u0936\u093e\u0928\u0926\u093e\u0930",  # शानदार
    "\u0906\u0938\u093e\u0928",  # आसान
    "\u0907\u0938\u094d\u0924\u0947\u092e\u093e\u0932",  # इस्तेमाल
    "\u092a\u094d\u0930\u094b\u0921\u0915\u094d\u091f",  # प्रोडक्ट
    "\u0910\u092a",  # ऐप
    "\u092c\u0939\u0941\u0924",  # बहुत
    "\u092c\u0922\u093c\u093f\u092f\u093e",  # बढ़िया
    "\u0924\u0947\u091c",  # तेज
    "\u0921\u093f\u0932\u0940\u0935\u0930\u0940",  # डिलीवरी
)

STRONG_SPAM_PHRASES = (
    "click here", "click now", "claim now", "act now", "limited offer",
    "free gift", "gift card", "free giveaway", "free recharge",
    "win free", "earn money", "make money", "get rich", "buy crypto",
    "cheap followers", "dm me", "subscribe", "whatsapp me",
    "telegram channel", "paise kamao", "ghar baithe",
    "\u092a\u0948\u0938\u0947 \u0915\u092e\u093e\u090f\u0902",
    "\u0918\u0930 \u092c\u0948\u0920\u0947",
    "\u092e\u0941\u092b\u094d\u0924 \u0911\u092b\u0930",
    "\u092f\u0939\u093e\u0901 \u0915\u094d\u0932\u093f\u0915",
    "\u0905\u092d\u0940 \u0915\u094d\u0932\u093f\u0915",
    "\u0907\u0928\u093e\u092e \u092a\u093e\u090f\u0902",
    "\u0907\u0928\u093e\u092e \u091c\u0940\u0924\u0947\u0902",
)


def get_device() -> int:
    if torch is not None and torch.cuda.is_available():
        return 0
    return -1


def load_model(state: ModelState) -> None:
    """Load one Hugging Face pipeline once and share it across requests."""
    with state.lock:
        if state.loaded or state.loading:
            return
        state.loading = True

    try:
        if pipeline is None:
            raise RuntimeError("transformers package could not be imported")

        state.device = get_device()
        model_kwargs = {}
        if state.device >= 0 and torch is not None:
            model_kwargs["torch_dtype"] = torch.float16

        hf_pipeline = cast(Any, pipeline)
        pipeline_kwargs: dict[str, Any] = {
            "task": state.task,
            "model": state.name,
            "tokenizer": state.name,
            "device": state.device,
            "cache_dir": MODEL_CACHE_DIR,
        }
        if model_kwargs:
            pipeline_kwargs["model_kwargs"] = model_kwargs

        state.pipeline = hf_pipeline(**pipeline_kwargs)
        state.loaded = True
        state.error = None
        logger.info("Loaded %s on %s", state.name, "cuda" if state.device >= 0 else "cpu")
    except Exception as exc:
        state.pipeline = None
        state.loaded = False
        state.error = str(exc)
        logger.exception("Could not load model %s", state.name)
    finally:
        state.loading = False


@app.on_event("startup")
async def load_models_on_startup() -> None:
    # Spam and sentiment are separate pipelines. Loading happens off the event
    # loop so FastAPI remains responsive during model initialization.
    await asyncio.gather(
        asyncio.to_thread(load_model, spam_state),
        asyncio.to_thread(load_model, sentiment_state),
    )


@lru_cache(maxsize=4096)
def preprocess_text(text: str) -> str:
    """Normalize noisy English, Hindi, and Hinglish social text for both models."""
    if not isinstance(text, str):
        return ""

    text = text.replace("\u200b", "").replace("\ufeff", "")
    text = text.replace("\\n", " ").replace("\n", " ")
    text = text.replace("#", "")
    text = re.sub(r"https?://\S+|www\.\S+", "<link>", text, flags=re.IGNORECASE)
    text = re.sub(r"\b[\w\.-]+@[\w\.-]+\.\w+\b", "<email>", text)
    text = re.sub(r"@\w+", "<user>", text)
    text = text.replace('"', "").replace("'", "")
    text = re.sub(r"([!?\u0964])\1{2,}", r"\1\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_confidence(score: Any, floor: float = 0.0) -> float:
    try:
        value = float(score)
    except (TypeError, ValueError):
        value = floor
    value = max(floor, min(1.0, value))
    return round(value, 4)


def spam_signal_strength(text: str) -> float:
    lower = text.lower()
    score = 0.0

    phrase_hits = sum(1 for phrase in STRONG_SPAM_PHRASES if phrase in lower)
    if phrase_hits:
        score += min(0.10, phrase_hits * 0.035)
    if "<link>" in lower or "<email>" in lower:
        score += 0.04
    if re.search(r"[$\u20b9\u20ac\u00a3]\s*\d+|\d+\s*(usd|dollars|rs|rupees|inr)", lower):
        score += 0.03
    if lower.count("!") >= 2:
        score += 0.015

    return min(score, 0.14)


def calibrate_spam_confidence(raw_score: Any, text: str) -> float:
    """Convert saturated model probabilities into useful UI confidence values."""
    raw = normalize_confidence(raw_score)
    if raw < SPAM_THRESHOLD:
        return raw

    scaled = (raw - SPAM_THRESHOLD) / max(1.0 - SPAM_THRESHOLD, 0.001)
    calibrated = 0.74 + (scaled * 0.12) + spam_signal_strength(text)
    return min(normalize_confidence(calibrated), 0.985)


def normalize_spam_label(label: str) -> str:
    label = str(label).lower().strip()
    if label in {"label_1", "spam", "spammer"}:
        return "spam"
    if label in {"label_0", "ham", "not_spam", "not spam"}:
        return "ham"
    return "spam" if "spam" in label and "not" not in label else "ham"


def normalize_sentiment_label(label: str) -> str:
    label = str(label).lower().strip()
    if label in {"label_2", "positive", "pos"}:
        return "positive"
    if label in {"label_0", "negative", "neg"}:
        return "negative"
    if label in {"label_1", "neutral", "neu"}:
        return "neutral"
    return "neutral"


def has_strong_spam_signal(text: str) -> bool:
    lower = text.lower()
    if "<link>" in lower or "<email>" in lower:
        return True
    if any(phrase in lower for phrase in STRONG_SPAM_PHRASES):
        return True
    if re.search(r"[$\u20b9\u20ac\u00a3]\s*\d+|\d+\s*(usd|dollars|rs|rupees|inr)", lower):
        return True
    return False


def looks_like_product_review(text: str) -> bool:
    lower = text.lower()
    words = set(re.findall(r"[a-zA-Z]+", lower))
    has_review_term = bool(words & REVIEW_TERMS)
    has_hindi_review_shape = any(term in lower for term in ("bahut", "hai", "yeh", "accha", "achha"))
    has_devanagari_review_term = any(term in text for term in HINDI_REVIEW_TERMS)
    return has_review_term or has_hindi_review_shape or has_devanagari_review_term


def fallback_spam_detection(text: str) -> dict[str, Any]:
    lower = text.lower()
    phrase_hits = sum(1 for phrase in FALLBACK_SPAM_PHRASES if phrase in lower)
    terms = set(re.findall(r"[a-zA-Z]+", lower))
    term_hits = len(terms & FALLBACK_SPAM_TERMS)
    has_url = bool(re.search(r"<link>|https?://|www\.|\S+\.(com|net|org|ly)\b", lower))
    has_money = bool(re.search(r"[$\u20b9\u20ac\u00a3]\s*\d+|\d+\s*(usd|dollars|rs|rupees|inr)", lower))
    noisy_push = lower.count("!") >= 3 or len(
        re.findall(r"\bfree\b|\bwin\b|\u092b\u094d\u0930\u0940|\u0911\u092b\u0930", lower)
    ) >= 2

    raw_score = 0.18 + phrase_hits * 0.24 + term_hits * 0.08
    if has_url:
        raw_score += 0.18
    if has_money:
        raw_score += 0.14
    if noisy_push:
        raw_score += 0.10

    confidence = min(normalize_confidence(raw_score), 0.98)
    return {
        "is_spam": confidence >= 0.72,
        "confidence": confidence if confidence >= 0.72 else normalize_confidence(1.0 - confidence, 0.5),
        "model": "rule-based spam fallback",
    }


@lru_cache(maxsize=4096)
def classify_spam_cached(clean_text: str) -> tuple[bool, float, str]:
    if not spam_state.loaded or spam_state.pipeline is None:
        fallback = fallback_spam_detection(clean_text)
        return fallback["is_spam"], fallback["confidence"], fallback["model"]

    try:
        with spam_state.inference_lock:
            result = spam_state.pipeline(clean_text, truncation=True)[0]
        label = normalize_spam_label(result.get("label", "ham"))
        confidence = normalize_confidence(result.get("score", 0.0))
        if label == "spam" and looks_like_product_review(clean_text) and not has_strong_spam_signal(clean_text):
            return False, confidence, SPAM_MODEL
        if label == "spam" and confidence >= SPAM_THRESHOLD:
            return True, calibrate_spam_confidence(confidence, clean_text), SPAM_MODEL
        return False, confidence, SPAM_MODEL
    except Exception:
        logger.exception("Spam inference failed; using fallback")
        fallback = fallback_spam_detection(clean_text)
        return fallback["is_spam"], fallback["confidence"], fallback["model"]


def analyze_with_rules(text: str) -> tuple[str, float]:
    words = re.findall(r"[a-zA-Z']+", text.lower())
    positive_score = sum(1 for word in words if word in POSITIVE_WORDS)
    negative_score = sum(1 for word in words if word in NEGATIVE_WORDS)
    total = positive_score + negative_score

    if total == 0:
        return "neutral", 0.62
    if positive_score > negative_score:
        return "positive", normalize_confidence(0.65 + (positive_score / total) * 0.3)
    if negative_score > positive_score:
        return "negative", normalize_confidence(0.65 + (negative_score / total) * 0.3)
    return "neutral", 0.58


def neutral_or_mixed_override(text: str) -> Optional[tuple[str, float]]:
    lower = text.lower()
    words = re.findall(r"[a-zA-Z']+", lower)
    word_set = set(words)
    positive_score = sum(1 for word in words if word in POSITIVE_WORDS)
    negative_score = sum(1 for word in words if word in NEGATIVE_WORDS)
    has_neutral_phrase = any(phrase in lower for phrase in NEUTRAL_PHRASES)
    has_contrast = bool(word_set & CONTRAST_WORDS)

    if has_contrast and positive_score > 0 and negative_score > 0:
        return "neutral", 0.72
    if has_neutral_phrase and abs(positive_score - negative_score) <= 1:
        return "neutral", 0.70
    if "good" in word_set and has_contrast and negative_score > 0:
        return "neutral", 0.68
    return None


@lru_cache(maxsize=4096)
def classify_sentiment_cached(clean_text: str) -> tuple[str, float, str]:
    if sentiment_state.loaded and sentiment_state.pipeline is not None:
        try:
            with sentiment_state.inference_lock:
                result = sentiment_state.pipeline(clean_text, truncation=True)[0]
            return (
                normalize_sentiment_label(result.get("label", "neutral")),
                normalize_confidence(result.get("score", 0.0)),
                SENTIMENT_MODEL,
            )
        except Exception:
            logger.exception("Sentiment inference failed; using fallback")

    sentiment, confidence = analyze_with_rules(clean_text)
    return sentiment, confidence, "rule-based sentiment fallback"


def model_summary(state: ModelState) -> dict[str, Any]:
    return {
        "name": state.name,
        "loaded": state.loaded,
        "loading": state.loading,
        "device": "cuda" if state.device >= 0 else "cpu",
        "error": state.error,
    }


@app.get("/")
def root():
    return {
        "status": "ok",
        "models": {
            "spam": model_summary(spam_state),
            "sentiment": model_summary(sentiment_state),
        },
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "spam_model_loaded": spam_state.loaded,
        "sentiment_model_loaded": sentiment_state.loaded,
        "fallback_enabled": not (spam_state.loaded and sentiment_state.loaded),
        "device": "cuda" if get_device() >= 0 else "cpu",
    }


@app.post("/predict")
def predict(req: TextRequest):
    raw_text = req.text.strip()
    if not raw_text:
        raise HTTPException(status_code=422, detail="Text must not be empty")

    clean_text = preprocess_text(raw_text)

    # Architecture: every comment is screened by the multilingual spam model.
    # Only ham/non-spam comments continue to the independent sentiment model.
    is_spam, spam_confidence, spam_model_name = classify_spam_cached(clean_text)
    if is_spam:
        return {
            "sentiment": "spam",
            "confidence": spam_confidence,
            "is_spam": True,
            "model": spam_model_name,
        }

    neutral_override = neutral_or_mixed_override(clean_text)
    if neutral_override is not None:
        sentiment, confidence = neutral_override
        return {
            "sentiment": sentiment,
            "confidence": normalize_confidence(confidence),
            "is_spam": False,
            "model": "product-review neutral override",
        }

    sentiment, confidence, sentiment_model_name = classify_sentiment_cached(clean_text)
    return {
        "sentiment": sentiment,
        "confidence": confidence,
        "is_spam": False,
        "model": sentiment_model_name,
    }
