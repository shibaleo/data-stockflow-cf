import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

interface AuditLog {
  uuid: string;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_key: number;
  entity_name: string | null;
  summary: string | null;
  created_at: string;
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: AuditLog[]; next_cursor: string | null }>("/audit-logs")
      .then((res) => setLogs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">監査ログ</h1>
        <p className="text-muted-foreground">システム操作の履歴</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground">ログがありません</p>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">日時</th>
                <th className="px-4 py-3 text-left text-sm font-medium">ユーザー</th>
                <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
                <th className="px-4 py-3 text-left text-sm font-medium">対象</th>
                <th className="px-4 py-3 text-left text-sm font-medium">概要</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.uuid} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-sm">{log.user_name}</td>
                  <td className="px-4 py-3 text-sm font-mono">{log.action}</td>
                  <td className="px-4 py-3 text-sm">
                    {log.entity_type} #{log.entity_key}
                    {log.entity_name && <span className="ml-1 text-muted-foreground">({log.entity_name})</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{log.summary ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
