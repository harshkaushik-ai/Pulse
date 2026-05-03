# News Trend Predictor

This repository contains a full-stack application to scrape news articles, compute trends, and provide AI-generated insights. The backend is an Express.js API server and the frontend is a React single-page application. Both services are containerized with Docker and orchestrated using Docker Compose.

## Structure

```
news-trend-predictor/
├── backend/     # Express API and services
├── frontend/    # React application
└── docker-compose.yml
```

## Getting Started

1. Copy `.env.example` to `.env` in both `backend` and `frontend` directories and fill in values.
2. Run `docker-compose up --build`.
3. Backend will be available at `http://localhost:5000` and frontend at `http://localhost:3000`.
