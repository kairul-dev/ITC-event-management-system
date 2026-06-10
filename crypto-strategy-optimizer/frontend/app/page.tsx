"use client";

import { useState } from "react";

type HealthResponse = {
  status: string;
  service: string;
};

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function testBackendConnection() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/health`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = (await response.json()) as HealthResponse;
      setHealth(data);
    } catch (connectionError) {
      setHealth(null);
      setError(
        connectionError instanceof Error
          ? connectionError.message
          : "Unable to connect to backend",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const statusText = error
    ? "Connection failed"
    : health?.status === "ok"
      ? "Connected"
      : "Not tested";

  return (
    <main className="page">
      <section className="dashboard">
        <div className="header">
          <div>
            <h1 className="title">Crypto Strategy Optimizer</h1>
            <p className="subtitle">
              Stage 1 dashboard for the Bitget backtesting and strategy
              optimization system.
            </p>
          </div>
          <div className="statusPill">{statusText}</div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2 className="panelTitle">Backend Health</h2>
            <button
              className="testButton"
              disabled={isLoading}
              onClick={testBackendConnection}
              type="button"
            >
              {isLoading ? "Testing..." : "Test API"}
            </button>
          </div>

          <div className="statusBox">
            <p className="statusLabel">API base URL</p>
            <p className="statusValue">{apiBaseUrl}</p>

            {health ? (
              <p className="statusDetail">
                Backend responded with status <strong>{health.status}</strong>{" "}
                from <strong>{health.service}</strong>.
              </p>
            ) : null}

            {error ? <p className="statusDetail error">{error}</p> : null}

            {!health && !error ? (
              <p className="statusDetail">
                Start the backend, then press Test API to verify the connection.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
