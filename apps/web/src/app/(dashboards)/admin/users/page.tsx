import { apiFetch, normalizePaginatedResponse } from "../../../_services/api-client";
import { Badge } from "../../../_components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../_components/ui/table";
import { formatDate } from "../../../_lib/utils";
import type { User, PaginatedResponse } from "../../../_lib/types";

export const dynamic = "force-dynamic";

async function getUsers(page: number): Promise<PaginatedResponse<User>> {
  const response = await apiFetch<PaginatedResponse<User>>(
    `/admin/users?page=${page}&limit=20`,
    { revalidate: 0 },
  ).catch(() => null);

  if (!response) {
    return { data: [], total: 0, page: 1, limit: 20 };
  }

  return normalizePaginatedResponse(response);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const { data: users, total } = await getUsers(page);

  const roleColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    platform_admin: "default",
    vendor: "secondary",
    customer: "outline",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm">{total} registered users</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {user.profile.firstName} {user.profile.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleColors[user.role] ?? "outline"}>
                      {user.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "active" ? "default" : "destructive"
                      }
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
