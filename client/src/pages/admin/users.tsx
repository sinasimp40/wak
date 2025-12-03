import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Users, 
  Search, 
  RefreshCw, 
  MoreVertical,
  Ban,
  CheckCircle,
  Trash2,
  Shield,
  User,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface UserData {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  balance: string;
  ordersCount: number;
  vpsCount: number;
  createdAt: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: "suspend" | "activate" | "delete" | null;
    userId: string | null;
    username: string | null;
  }>({ open: false, type: null, userId: null, username: null });

  const { data: users, isLoading, refetch, isRefetching } = useQuery<UserData[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/status`, { status });
    },
    onSuccess: () => {
      toast({ title: "User updated", description: "User status has been updated." });
      setActionDialog({ open: false, type: null, userId: null, username: null });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast({ title: "User deleted", description: "User has been removed from the system." });
      setActionDialog({ open: false, type: null, userId: null, username: null });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const filteredUsers = users?.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleAction = () => {
    if (!actionDialog.userId) return;

    if (actionDialog.type === "suspend") {
      updateStatusMutation.mutate({ userId: actionDialog.userId, status: "suspended" });
    } else if (actionDialog.type === "activate") {
      updateStatusMutation.mutate({ userId: actionDialog.userId, status: "active" });
    } else if (actionDialog.type === "delete") {
      deleteMutation.mutate(actionDialog.userId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all platform users
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-users"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh-users"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            {filteredUsers?.length || 0} user{filteredUsers?.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">VPS</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            {user.role === "admin" ? (
                              <Shield className="h-5 w-5 text-primary" />
                            ) : (
                              <User className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.status === "active"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20"
                          }
                        >
                          {user.status === "active" ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <Ban className="h-3 w-3 mr-1" />
                          )}
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${parseFloat(user.balance).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{user.ordersCount}</TableCell>
                      <TableCell className="text-right">{user.vpsCount}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-user-menu-${user.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.status === "active" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  setActionDialog({
                                    open: true,
                                    type: "suspend",
                                    userId: user.id,
                                    username: user.username,
                                  })
                                }
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Suspend User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  setActionDialog({
                                    open: true,
                                    type: "activate",
                                    userId: user.id,
                                    username: user.username,
                                  })
                                }
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Activate User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                setActionDialog({
                                  open: true,
                                  type: "delete",
                                  userId: user.id,
                                  username: user.username,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No users found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Try adjusting your search query" : "No users have registered yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) =>
          setActionDialog({ open, type: null, userId: null, username: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "suspend" && "Suspend User"}
              {actionDialog.type === "activate" && "Activate User"}
              {actionDialog.type === "delete" && "Delete User"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === "suspend" &&
                `Are you sure you want to suspend ${actionDialog.username}? They will not be able to access their account.`}
              {actionDialog.type === "activate" &&
                `Are you sure you want to activate ${actionDialog.username}? They will regain access to their account.`}
              {actionDialog.type === "delete" &&
                `Are you sure you want to delete ${actionDialog.username}? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActionDialog({ open: false, type: null, userId: null, username: null })
              }
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.type === "delete" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={updateStatusMutation.isPending || deleteMutation.isPending}
              data-testid="button-confirm-action"
            >
              {(updateStatusMutation.isPending || deleteMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {actionDialog.type === "suspend" && "Suspend"}
              {actionDialog.type === "activate" && "Activate"}
              {actionDialog.type === "delete" && "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
