# Sentiment Analysis Dashboard

A full-stack sentiment analysis project for classifying customer comments as positive, negative, neutral, or spam. The app supports pasted text and CSV uploads, removes duplicate comments before analysis, and presents results in an interactive dashboard with charts, confidence scores, keyword views, and PDF export.

## Features

- Paste comments manually or upload a CSV file
- Auto-detect likely comment columns such as `comment`, `review`, `feedback`, `text`, or `message`
- Review total, unique, and duplicate row counts before running analysis
- Choose between fast local pattern matching and a local FastAPI transformer backend
- Detect spam before sentiment classification
- View sentiment distribution, confidence scores, keyword cloud, and drill-down comment lists
- Export a PDF report from the dashboard
- Includes sample CSV datasets and dataset generation scripts

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui and Radix UI
- Recharts
- Papa Parse
- jsPDF

### Backend

- Python 3.10+
- FastAPI
- Uvicorn
- Hugging Face Transformers
- PyTorch

## Project Structure

```text
.
+-- backend/
|   +-- api.py
|   +-- requirements.txt
+-- frontend/
|   +-- clarity-sentiment-analyzer-main/
|       +-- src/
|       +-- package.json
|       +-- vite.config.ts
+-- comments_dataset.csv
+-- project_comments_500_multilingual_duplicates.csv
+-- sony_wh1000xm5_comments_500.csv
+-- HOW_TO_RUN.txt
+-- PROJECT_REQUIREMENTS.txt
+-- README.md
```

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer
- npm
- Internet connection for the first transformer model download

## Getting Started

Open a terminal in the project root folder.

### 1. Install Backend Dependencies

```bash
cd backend
python -m pip install -r requirements.txt
```

On Windows, you can also use:

```bash
cd backend
py -m pip install -r requirements.txt
```

### 2. Start the Backend

```bash
python -m uvicorn api:app --host 127.0.0.1 --port 8000
```

On Windows:

```bash
py -m uvicorn api:app --host 127.0.0.1 --port 8000
```

Backend URL:

```text
http://127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/health
```

### 3. Install Frontend Dependencies

Open a second terminal from the project root.

```bash
cd frontend/clarity-sentiment-analyzer-main
npm install
```

### 4. Start the Frontend

```bash
npm run dev
```

Open the Vite URL in your browser. The project is configured to work with:

```text
http://localhost:8080
http://127.0.0.1:8080
```

If Vite starts on a different port, use the URL shown in the terminal.

## Usage

1. Open the frontend in your browser.
2. Paste comments or upload a CSV file.
3. Select the column that contains comments if using CSV input.
4. Parse and review the dataset summary.
5. Choose an analysis model:
   - `Pattern Matching`: fast local baseline analysis.
   - `Local Transformer`: uses the FastAPI backend at `http://127.0.0.1:8000`.
   - `Cloud API`: placeholder for future cloud integration.
6. Run the analysis.
7. Review charts, confidence distribution, keyword cloud, and detailed comment lists.
8. Export the dashboard report as PDF if needed.

## Backend API

### `GET /`

Returns service status and model loading details.

### `GET /health`

Returns backend health, loaded model status, fallback status, and device type.

### `POST /predict`

Classifies one text input.

Request:

```json
{
  "text": "The product quality is excellent and delivery was fast."
}
```

Response:

```json
{
  "sentiment": "positive",
  "confidence": 0.98,
  "is_spam": false,
  "model": "cardiffnlp/twitter-roberta-base-sentiment-latest"
}
```

Possible sentiment values:

- `positive`
- `negative`
- `neutral`
- `spam`

## Transformer Models

The backend uses these Hugging Face models:

- `cardiffnlp/twitter-roberta-base-sentiment-latest`
- `nahiar/spam-detection-xlm-roberta-v3`

Models are downloaded automatically on first backend startup and cached in:

```text
backend/model_cache
```

Large model files are not included in the repository.

## Datasets

Included CSV files can be used to test the dashboard:

- `comments_dataset.csv`
- `project_comments_500_multilingual_duplicates.csv`
- `sony_wh1000xm5_comments_500.csv`

This project uses the `sony_wh1000xm5_comments_500.csv` dataset for analyzing Sony WH-1000XM5 customer comments and product feedback.

For CSV uploads, select the column that contains the comment or review text.

## Useful Commands

Run frontend production build:

```bash
cd frontend/clarity-sentiment-analyzer-main
npm run build
```

Run frontend lint:

```bash
cd frontend/clarity-sentiment-analyzer-main
npm run lint
```

Run backend only:

```bash
cd backend
python -m uvicorn api:app --host 127.0.0.1 --port 8000
```

Run frontend only:

```bash
cd frontend/clarity-sentiment-analyzer-main
npm run dev
```

## Troubleshooting

### Backend is not reachable

Make sure the backend is running at:

```text
http://127.0.0.1:8000
```

Then check:

```text
http://127.0.0.1:8000/health
```

### First startup is slow

The backend may be downloading transformer models from Hugging Face. Wait for the download and model load to finish.

### Model download fails

- Check your internet connection.
- Run the backend command again.
- Make sure there is enough disk space for the model cache.
- If Hugging Face rate limits appear, set an `HF_TOKEN` environment variable.

### Frontend dependencies are missing

Run:

```bash
cd frontend/clarity-sentiment-analyzer-main
npm install
```

## Repository Notes

The following generated files and folders should not be committed:

- `node_modules`
- `dist`
- `__pycache__`
- `backend/model_cache`
- downloaded model files
- temporary cache folders

These are recreated by installing dependencies, building the frontend, or running the backend.
