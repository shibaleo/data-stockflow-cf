import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Voucher {
  id: number;
  sequence_no: number;
  date: string;
  description: string | null;
  revision: number;
  is_active: boolean;
  created_at: string;
}

export function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: Voucher[] }>("/vouchers")
      .then((res) => setVouchers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">伝票</h1>
          <p className="text-muted-foreground">伝票の一覧と管理</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          新規作成
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : vouchers.length === 0 ? (
        <p className="text-muted-foreground">伝票がありません</p>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">No.</th>
                <th className="px-4 py-3 text-left text-sm font-medium">日付</th>
                <th className="px-4 py-3 text-left text-sm font-medium">摘要</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Rev</th>
                <th className="px-4 py-3 text-left text-sm font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm font-mono">{v.sequence_no}</td>
                  <td className="px-4 py-3 text-sm">{v.date}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{v.description ?? "-"}</td>
                  <td className="px-4 py-3 text-sm font-mono">{v.revision}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={v.is_active ? "text-green-400" : "text-red-400"}>
                      {v.is_active ? "有効" : "無効"}
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
