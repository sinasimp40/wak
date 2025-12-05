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
  Mail,
  Globe,
  Server,
  Calendar,
  Eye,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface VpsData {
  id: string;
  os: string;
  ipAddress: string | null;
  status: string;
  createdAt: string;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  balance: string;
  registrationIp: string | null;
  suspendedUntil: string | null;
  ordersCount: number;
  vpsCount: number;
  vpsList: VpsData[];
  createdAt: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: "suspend" | "activate" | "delete" | "email" | "vps" | null;
    userId: string | null;
    username: string | null;
    currentEmail?: string;
    vpsList?: VpsData[];
  }>({ open: false, type: null, userId: null, username: null });
  const [newEmail, setNewEmail] = useState("");
  const [suspendDuration, setSuspendDuration] = useState("permanent");

  const { data: users, isLoading, refetch, isRefetching } = useQuery<UserData[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status, suspendedUntil }: { userId: string; status: string; suspendedUntil?: string | null }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/status`, { status, suspendedUntil });
    },
    onSuccess: () => {
      toast({ title: "User updated", description: "User status has been updated." });
      setActionDialog({ open: false, type: null, userId: null, username: null });
      setSuspendDuration("permanent");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const updateEmailMutation = useMutation({
    mutationFn: async ({ userId, email }: { userId: string; email: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/email`, { email });
    },
    onSuccess: () => {
      toast({ title: "Email updated", description: "User email has been updated." });
      setActionDialog({ open: false, type: null, userId: null, username: null });
      setNewEmail("");
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
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.registrationIp && user.registrationIp.includes(searchQuery))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSuspendedUntilDate = (duration: string): string | null => {
    if (duration === "permanent") return null;
    const now = new Date();
    switch (duration) {
      case "1day":
        now.setDate(now.getDate() + 1);
        break;
      case "3days":
        now.setDate(now.getDate() + 3);
        break;
      case "7days":
        now.setDate(now.getDate() + 7);
        break;
      case "30days":
        now.setDate(now.getDate() + 30);
        break;
      case "90days":
        now.setDate(now.getDate() + 90);
        break;
      default:
        return null;
    }
    return now.toISOString();
  };

  const handleAction = () => {
    if (!actionDialog.userId) return;

    if (actionDialog.type === "suspend") {
      const suspendedUntil = getSuspendedUntilDate(suspendDuration);
      updateStatusMutation.mutate({ userId: actionDialog.userId, status: "suspended", suspendedUntil });
    } else if (actionDialog.type === "activate") {
      updateStatusMutation.mutate({ userId: actionDialog.userId, status: "active", suspendedUntil: null });
    } else if (actionDialog.type === "delete") {
      deleteMutation.mutate(actionDialog.userId);
    } else if (actionDialog.type === "email") {
      updateEmailMutation.mutate({ userId: actionDialog.userId, email: newEmail });
    }
  };

  const getStatusBadge = (user: UserData) => {
    if (user.status === "active") {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          active
        </Badge>
      );
    }
    
    if (user.suspendedUntil) {
      const suspendedUntilDate = new Date(user.suspendedUntil);
      const now = new Date();
      if (suspendedUntilDate > now) {
        return (
          <div className="flex flex-col gap-1">
            <Badge
              variant="outline"
              className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20"
            >
              <Ban className="h-3 w-3 mr-1" />
              suspended
            </Badge>
            <span className="text-xs text-muted-foreground">
              Until {formatDate(user.suspendedUntil)}
            </span>
          </div>
        );
      }
    }
    
    return (
      <Badge
        variant="outline"
        className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20"
      >
        <Ban className="h-3 w-3 mr-1" />
        suspended
      </Badge>
    );
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
              placeholder="Search users, email, IP..."
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
                    <TableHead>Registration IP</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">RDP/VPS</TableHead>
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
                        {getStatusBadge(user)}
                      </TableCell>
                      <TableCell>
                        {user.registrationIp ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {user.registrationIp}
                            </code>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${parseFloat(user.balance).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{user.ordersCount}</TableCell>
                      <TableCell className="text-right">
                        {user.vpsCount > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: "vps",
                                userId: user.id,
                                username: user.username,
                                vpsList: user.vpsList,
                              })
                            }
                          >
                            <Server className="h-3 w-3 mr-1" />
                            {user.vpsCount}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
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
                            <DropdownMenuItem
                              onClick={() => {
                                setNewEmail(user.email);
                                setActionDialog({
                                  open: true,
                                  type: "email",
                                  userId: user.id,
                                  username: user.username,
                                  currentEmail: user.email,
                                });
                              }}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Change Email
                            </DropdownMenuItem>
                            {user.vpsList && user.vpsList.length > 0 && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setActionDialog({
                                    open: true,
                                    type: "vps",
                                    userId: user.id,
                                    username: user.username,
                                    vpsList: user.vpsList,
                                  })
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View RDP/VPS
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
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
        open={actionDialog.open && actionDialog.type !== "vps" && actionDialog.type !== "email"}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({ open: false, type: null, userId: null, username: null });
            setSuspendDuration("permanent");
          }
        }}
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
          
          {actionDialog.type === "suspend" && (
            <div className="space-y-3 py-4">
              <Label>Suspension Duration</Label>
              <Select value={suspendDuration} onValueChange={setSuspendDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1day">1 Day</SelectItem>
                  <SelectItem value="3days">3 Days</SelectItem>
                  <SelectItem value="7days">7 Days</SelectItem>
                  <SelectItem value="30days">30 Days</SelectItem>
                  <SelectItem value="90days">90 Days</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ open: false, type: null, userId: null, username: null });
                setSuspendDuration("permanent");
              }}
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

      {/* Email Change Dialog */}
      <Dialog
        open={actionDialog.open && actionDialog.type === "email"}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({ open: false, type: null, userId: null, username: null });
            setNewEmail("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>
              Update the email address for {actionDialog.username}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">New Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="new@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ open: false, type: null, userId: null, username: null });
                setNewEmail("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={updateEmailMutation.isPending || !newEmail || newEmail === actionDialog.currentEmail}
            >
              {updateEmailMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Update Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VPS List Dialog */}
      <Dialog
        open={actionDialog.open && actionDialog.type === "vps"}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({ open: false, type: null, userId: null, username: null });
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              RDP/VPS for {actionDialog.username}
            </DialogTitle>
            <DialogDescription>
              List of all RDP/VPS instances owned by this user.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {actionDialog.vpsList && actionDialog.vpsList.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OS</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actionDialog.vpsList.map((vps) => (
                      <TableRow key={vps.id}>
                        <TableCell className="font-medium">{vps.os}</TableCell>
                        <TableCell>
                          {vps.ipAddress ? (
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {vps.ipAddress}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              vps.status === "runned"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            }
                          >
                            {vps.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(vps.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No RDP/VPS instances found.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActionDialog({ open: false, type: null, userId: null, username: null })
              }
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
