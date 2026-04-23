import { useClerk } from "@clerk/react";
import { useMe } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function SettingsPage() {
  const me = useMe();
  const { signOut } = useClerk();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">設定</h1>
        <p className="text-muted-foreground">アカウント設定</p>
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">ユーザー情報</h2>
        <div className="grid gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">名前</span>
            <span>{me.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">メール</span>
            <span>{me.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ロール</span>
            <span>{me.role_name}</span>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <Button variant="destructive" onClick={() => signOut()}>
          ログアウト
        </Button>
      </div>
    </div>
  );
}
