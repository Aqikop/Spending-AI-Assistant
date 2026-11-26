# Frontend (React + Vite + Tailwind CSS)

Owned by the frontend teammate. Scaffold here, for example: `npm create vite@latest . -- --template react-ts`, then add Tailwind.

- Talks to the backend only through the routes at `/docs`. No business logic in the UI.
- Dev: Vite proxy to the FastAPI port.
- Build: `npm run build` writes `frontend/dist`, served by FastAPI and included in the submission zip.
- Mock fixtures for early work go in `src/mocks/`.
