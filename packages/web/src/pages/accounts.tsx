import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Account {
  id: number;
  code: string;
  name: string;
  account_type: string;
  sign: number;
  classification: string | null;
  parent_account_id: number | null;
  is_active: boolean;
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: Account[] }>("/accounts")
      .then((res) => setAccounts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">勘定科目</h1>
          <p className="text-muted-foreground">勘定科目の一覧と管理</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          新規作成
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : accounts.length === 0 ? (
        <p className="text-muted-foreground">勘定科目がありません</p>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">コード</th>
                <th className="px-4 py-3 text-left text-sm font-medium">名前</th>
                <th className="px-4 py-3 text-left text-sm font-medium">種別</th>
                <th className="px-4 py-3 text-left text-sm font-medium">分類</th>
                <th className="px-4 py-3 text-left text-sm font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm font-mono">{a.code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{a.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{a.account_type}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{a.classification ?? "-"}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={a.is_active ? "text-green-400" : "text-red-400"}>
                      {a.is_active ? "有効" : "無効"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
