import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "../components/AdminDashboard";
import { getAdminDashboard } from "../features/admin/admin.functions";

export const Route = createFileRoute("/admin")({
  loader: () => getAdminDashboard(),
  head: () => ({ meta: [{ title: "관리자 콘솔 · Rootorial" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminRoute,
});

function AdminRoute() {
  return <AdminDashboard initialData={Route.useLoaderData()} />;
}
