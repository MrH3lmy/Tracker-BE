import { Send } from "lucide-react";
import { useState } from "react";
import { jsonRequest, type ApiExchange, type JsonMethod } from "../api/client";
import { RequestInspector } from "../components/RequestInspector";

export interface EndpointDefinition {
  method: JsonMethod;
  path: string;
  label: string;
  body?: unknown;
}

interface EndpointPageProps {
  title: string;
  endpoints: EndpointDefinition[];
}

export function EndpointPage({ title, endpoints }: EndpointPageProps) {
  const [exchange, setExchange] = useState<ApiExchange | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);

  const runEndpoint = async (endpoint: EndpointDefinition) => {
    setActivePath(`${endpoint.method} ${endpoint.path}`);
    const result = await jsonRequest({
      method: endpoint.method,
      path: endpoint.path,
      body: endpoint.body
    });
    setExchange(result);
    setActivePath(null);
  };

  return (
    <div className="page-grid">
      <section className="workspace-panel">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{title}</p>
            <h1>{title} Endpoints</h1>
          </div>
        </div>

        <div className="endpoint-list">
          {endpoints.map((endpoint) => {
            const key = `${endpoint.method} ${endpoint.path}`;
            const isLoading = activePath === key;

            return (
              <div className="endpoint-row" key={key}>
                <span className={`method-pill ${endpoint.method.toLowerCase()}`}>
                  {endpoint.method}
                </span>
                <code>{endpoint.path}</code>
                <span className="endpoint-label">{endpoint.label}</span>
                <button
                  className="icon-button"
                  type="button"
                  title={`Send ${key}`}
                  aria-label={`Send ${key}`}
                  disabled={isLoading}
                  onClick={() => void runEndpoint(endpoint)}
                >
                  <Send size={15} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <RequestInspector exchange={exchange} loading={activePath !== null} />
    </div>
  );
}
