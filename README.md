# Fraud Detection Management Dashboard

A comprehensive dashboard for managing and analyzing potentially fraudulent transactions. The system ingests transactions, scores them using a rule-based engine, and flags high-risk transactions for investigation by analysts and supervisors. The application includes role-based access control, a detailed case management workflow, and an extensive audit log for tracking all system activities.

## Technology Stack

*   **Frontend:** React
*   **Backend:** Node.js with Express
*   **Database:** SQLite

## Folder Structure

*   `client/`: React frontend application.
*   `server/`: Node.js/Express backend application.
    *   `routes/`: API endpoint definitions (thin layer).
    *   `services/`: Core business logic and rules engine.
    *   `models/`: Data access layer for SQLite.
    *   `db/`: Database storage and configuration.
*   `tests/`: Unit and integration tests.
*   `docs/`: Project documentation.

## How to Run

### Server

1. Navigate to the `server/` directory: `cd server`
2. Install dependencies: `npm install`
3. Set up environment variables: copy `.env.example` to `.env` and adjust if needed: `cp .env.example .env`
4. Run the development server: `npm run dev`
5. The API will be available at `http://localhost:5001/api/health`

### Client

*(Instructions to run the React client will go here)*
