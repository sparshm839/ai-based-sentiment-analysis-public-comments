# Sentiment Analysis Project

## Backend
cd backend
python -m pip install -r requirements.txt
python -m uvicorn api:app --host 127.0.0.1 --port 8000

## Frontend
cd frontend/clarity-sentiment-analyzer-main
npm install
npm run dev

Open the local frontend URL shown by Vite. Use the CSV upload and select the `comment` column for the Sony dataset.

## Notes
- `node_modules`, Python caches, logs, model cache, and backup folders are intentionally excluded.
- The backend will download/cache the transformer model on first run if it is not already present.
