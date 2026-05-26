import { RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBaseUrl, jsonRequest, type ApiExchange } from "../api/client";
import { RequestInspector } from "../components/RequestInspector";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function renderValue(value: unknown) {
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return String(value.length);
  }

  if (isRecord(value)) {
    return String(Object.keys(value).length);
  }

  return "-";
}

export function DashboardPage() {
  const [exchange, setExchange] = useState<ApiExchange | null>(null);
  const [loading, setLoading] = useState(false);

  const checkApi = useCallback(async () => {
    setLoading(true);
    const result = await jsonRequest({ method: "GET", path: "/api/v1/dashboard" });
    setExchange(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    void checkApi();
  }, [checkApi]);

  const summaryItems = useMemo(() => {
    const json = exchange?.response.json;

    if (!isRecord(json)) {
      return [];
    }

    return Object.entries(json).slice(0, 6);
  }, [exchange]);

  return (
    <div className="page-grid">
      <section className="workspace-panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>API Smoke Test</h1>
            <span className="subtle">Base URL: {apiBaseUrl}</span>
          </div>
          <button className="primary-button" onClick={checkApi} disabled={loading}>
            <RefreshCcw size={16} aria-hidden="true" />
            <span>{loading ? "Checking" : "Check API"}</span>
          </button>
        </div>

        <div className="endpoint-strip">
          <span className="method-pill">GET</span>
          <code>/api/v1/dashboard</code>
        </div>

        <div className="metric-grid">
          {summaryItems.length > 0 ? (
            summaryItems.map(([key, value]) => (
              <div className="metric-tile" key={key}>
                <span>{key}</span>
                <strong>{renderValue(value)}</strong>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <strong>No dashboard payload yet</strong>
              <span>Run the smoke test with the backend on port 8080.</span>
            </div>
          )}
        </div>
      </section>

      <RequestInspector exchange={exchange} loading={loading} />
    </div>
  );
}
