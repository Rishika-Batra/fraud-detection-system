# Fraud Detection Management Dashboard

A comprehensive dashboard for managing and analyzing potentially fraudulent transactions. The system ingests transactions, scores them using a rule-based engine, and flags high-risk transactions for investigation by analysts and supervisors. The application includes role-based access control, a detailed case management workflow, and an extensive audit log for tracking all system activities.

📚 **[View the API Contract for Frontend Developers](docs/api-contract.md)**

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

### Seeding Demo Data

The project includes a seed script that fills the database with realistic demo data (~300 transactions, 25 cases, 6 users) so the dashboard has something to show from day one.

```bash
cd server

# Dry run — shows what would happen, changes nothing
npm run seed

# Actually seed (drops and recreates ALL tables)
npm run seed -- --yes

# Use a specific password for all demo accounts
SEED_PASSWORD=MyPass123 npm run seed -- --yes

# Override the random seed for different data
SEED_RANDOM=42 npm run seed -- --yes
```

**Safety features:**
- Refuses to run when `NODE_ENV=production`
- Requires `--yes` flag to actually modify the database
- Uses `sequelize.sync({ force: true })` — this **deletes all existing data**

### Demo Accounts

After seeding, the following accounts are available (all share the same password, printed at the end of the seed):

| Username      | Role       | Access                                    |
|---------------|------------|-------------------------------------------|
| `admin`       | admin      | User management, audit logs, reports      |
| `analyst1`    | analyst    | View/flag transactions, manage cases      |
| `analyst2`    | analyst    | View/flag transactions, manage cases      |
| `analyst3`    | analyst    | View/flag transactions, manage cases      |
| `supervisor1` | supervisor | All analyst actions + reassign, escalate, reports |
| `supervisor2` | supervisor | All analyst actions + reassign, escalate, reports |

### Client

*(Instructions to run the React client will go here)*

