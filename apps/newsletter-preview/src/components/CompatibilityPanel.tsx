import type { CompatibilityReport } from "../utils/compatibility";

interface CompatibilityPanelProps {
  report: CompatibilityReport | null;
  clientName: string;
}

export function CompatibilityPanel({ report, clientName }: CompatibilityPanelProps) {
  if (!report) return null;

  const gradeColors: Record<string, string> = {
    A: "text-success",
    B: "text-success/80",
    C: "text-warning",
    D: "text-danger/80",
    F: "text-danger",
  };

  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Compatibility</h3>
        <span className="text-xs text-text-muted">{clientName}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className={`text-3xl font-bold ${gradeColors[report.grade]}`}>{report.grade}</div>
          <div className="text-xs text-text-muted mt-1">Grade</div>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold ${gradeColors[report.grade]}`}>{report.score}</div>
          <div className="text-xs text-text-muted mt-1">Score</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-text-primary">{report.totalIssues}</div>
          <div className="text-xs text-text-muted mt-1">Issues</div>
        </div>
      </div>

      {report.issues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            CSS Issues
          </h4>
          <div className="max-h-60 overflow-y-auto space-y-1.5">
            {report.issues.map((issue, idx) => (
              <div
                key={idx}
                className="bg-bg-primary rounded-md p-2.5 border border-border/50 text-xs"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-medium text-danger">{issue.property}</span>
                  <span className="text-text-muted">× {issue.occurrences}</span>
                  <span className="ml-auto px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted text-[10px]">
                    {issue.location}
                  </span>
                </div>
                <p className="text-text-secondary">{issue.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.hasExternalStylesheets && (
        <div className="bg-warning/10 border border-warning/20 rounded-md p-2.5 text-xs text-warning">
          External stylesheets detected — will be stripped by email clients.
        </div>
      )}

      {report.hasAtImport && (
        <div className="bg-warning/10 border border-warning/20 rounded-md p-2.5 text-xs text-warning">
          @import rules detected — will be stripped by email clients.
        </div>
      )}
    </div>
  );
}
