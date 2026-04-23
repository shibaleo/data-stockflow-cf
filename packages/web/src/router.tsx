import {
  createRouter,
  createRootRoute,
  createRoute,
} from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/pages/dashboard";
import { BooksPage } from "@/pages/books";
import { AccountsPage } from "@/pages/accounts";
import { CounterpartiesPage } from "@/pages/counterparties";
import { VouchersPage } from "@/pages/vouchers";
import { ReportsPage } from "@/pages/reports";
import { AuditLogsPage } from "@/pages/audit-logs";
import { SettingsPage } from "@/pages/settings";
import { SsoCallbackPage } from "@/pages/sso-callback";

const rootRoute = createRootRoute();

const ssoCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sso-callback",
  component: SsoCallbackPage,
});

const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "layout",
  component: AppLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/",
  component: DashboardPage,
});

const booksRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/books",
  component: BooksPage,
});

const accountsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/accounts",
  component: AccountsPage,
});

const counterpartiesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/counterparties",
  component: CounterpartiesPage,
});

const vouchersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/vouchers",
  component: VouchersPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/reports",
  component: ReportsPage,
});

const auditLogsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/audit-logs",
  component: AuditLogsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  ssoCallbackRoute,
  layoutRoute.addChildren([
    indexRoute,
    booksRoute,
    accountsRoute,
    counterpartiesRoute,
    vouchersRoute,
    reportsRoute,
    auditLogsRoute,
    settingsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
