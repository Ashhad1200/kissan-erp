"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  createdAt: string;
}

const ROLES = ["ADMIN", "MANAGER", "STAFF"];

const EMPTY_USER_FORM = { name: "", email: "", password: "", role: "STAFF" };

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userOpen, setUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({ ...EMPTY_USER_FORM });
  const [savingUser, setSavingUser] = useState(false);

  // General settings
  const [generalForm, setGeneralForm] = useState({ storeName: "KissanMall", address: "", phone: "", email: "" });
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Shopify settings
  const [shopifyForm, setShopifyForm] = useState({ domain: "", token: "" });
  const [savingShopify, setSavingShopify] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadUsers = () => {
    setLoadingUsers(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoadingUsers(false));
  };

  const loadSettings = () => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.general) setGeneralForm(d.general);
        if (d.shopify) setShopifyForm(d.shopify);
      })
      .catch(() => {});
  };

  useEffect(() => { loadUsers(); loadSettings(); }, []);

  const handleAddUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.password) return toast.error("Name, email and password are required");
    setSavingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      toast.success("User created");
      setUserOpen(false);
      setUserForm({ ...EMPTY_USER_FORM });
      loadUsers();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSavingUser(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "general", ...generalForm }),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSaveShopify = async () => {
    setSavingShopify(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "shopify", ...shopifyForm }),
      });
      if (!res.ok) throw new Error();
      toast.success("Shopify credentials saved");
    } catch {
      toast.error("Failed to save Shopify settings");
    } finally {
      setSavingShopify(false);
    }
  };

  const handleShopifySync = async () => {
    if (!shopifyForm.domain || !shopifyForm.token) return toast.error("Save Shopify credentials first");
    setSyncing(true);
    try {
      const res = await fetch("/api/shopify/sync", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      const data = await res.json();
      toast.success(`Sync complete: ${data.synced ?? 0} orders synced`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700",
    MANAGER: "bg-blue-100 text-blue-700",
    STAFF: "bg-gray-100 text-gray-700",
  };

  const uf = (key: keyof typeof userForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setUserForm((p) => ({ ...p, [key]: e.target.value }));
  const gf = (key: keyof typeof generalForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setGeneralForm((p) => ({ ...p, [key]: e.target.value }));
  const sf = (key: keyof typeof shopifyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setShopifyForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage users and system configuration</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="shopify">Shopify</TabsTrigger>
        </TabsList>

        {/* USERS */}
        <TabsContent value="users">
          <div className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Dialog open={userOpen} onOpenChange={(o) => setUserOpen(o)}>
                <DialogTrigger render={<Button className="bg-green-600 hover:bg-green-700" />}>
                    <Plus className="h-4 w-4 mr-2" /> Add User
                  </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-1">
                    <div className="space-y-1">
                      <Label>Full Name *</Label>
                      <Input value={userForm.name} onChange={uf("name")} placeholder="John Doe" />
                    </div>
                    <div className="space-y-1">
                      <Label>Email *</Label>
                      <Input type="email" value={userForm.email} onChange={uf("email")} placeholder="john@kissanmall.com" />
                    </div>
                    <div className="space-y-1">
                      <Label>Password *</Label>
                      <Input type="password" value={userForm.password} onChange={uf("password")} placeholder="Min. 8 characters" />
                    </div>
                    <div className="space-y-1">
                      <Label>Role</Label>
                      <select value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}
                        className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-ring/50">
                        {ROLES.map((r) => (<option key={r} value={r}>{r}</option>))}
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                    <Button onClick={handleAddUser} disabled={savingUser} className="bg-green-600 hover:bg-green-700">
                      {savingUser ? "Creating..." : "Create User"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loadingUsers ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="pr-4">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-gray-400 py-12 pl-4">No users found</TableCell></TableRow>
                      ) : (
                        users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="pl-4 font-medium">{u.name ?? "—"}</TableCell>
                            <TableCell className="text-gray-500">{u.email ?? "—"}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-700"}`}>
                                {u.role}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500 pr-4">
                              {new Date(u.createdAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* GENERAL */}
        <TabsContent value="general">
          <div className="mt-4 max-w-lg">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Store Information</CardTitle>
                <CardDescription>Basic store details used in documents and reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Store Name</Label>
                  <Input value={generalForm.storeName} onChange={gf("storeName")} placeholder="KissanMall" />
                </div>
                <div className="space-y-1">
                  <Label>Address</Label>
                  <Input value={generalForm.address} onChange={gf("address")} placeholder="123 Main Street, Lahore" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={generalForm.phone} onChange={gf("phone")} placeholder="+92 300 0000000" />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={generalForm.email} onChange={gf("email")} placeholder="info@kissanmall.com" />
                  </div>
                </div>
                <Separator />
                <Button onClick={handleSaveGeneral} disabled={savingGeneral} className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 mr-2" />
                  {savingGeneral ? "Saving..." : "Save Settings"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SHOPIFY */}
        <TabsContent value="shopify">
          <div className="mt-4 max-w-lg space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shopify Integration</CardTitle>
                <CardDescription>Connect your Shopify store to sync orders automatically</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Store Domain</Label>
                  <Input
                    value={shopifyForm.domain}
                    onChange={sf("domain")}
                    placeholder="your-store.myshopify.com"
                  />
                  <p className="text-xs text-gray-400">Without https://</p>
                </div>
                <div className="space-y-1">
                  <Label>Access Token</Label>
                  <Input
                    type="password"
                    value={shopifyForm.token}
                    onChange={sf("token")}
                    placeholder="shpat_xxxxxxxxxxxx"
                  />
                  <p className="text-xs text-gray-400">Shopify Admin API access token</p>
                </div>
                <Separator />
                <div className="flex gap-3">
                  <Button onClick={handleSaveShopify} disabled={savingShopify} className="bg-green-600 hover:bg-green-700">
                    <Save className="h-4 w-4 mr-2" />
                    {savingShopify ? "Saving..." : "Save Credentials"}
                  </Button>
                  <Button onClick={handleShopifySync} disabled={syncing} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Syncing..." : "Sync Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base text-gray-600">How to get credentials</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-500 space-y-2">
                <p>1. Go to your Shopify Admin → <strong>Apps</strong></p>
                <p>2. Click <strong>Develop apps</strong> → Create an app</p>
                <p>3. Under <strong>API credentials</strong>, generate Admin API tokens</p>
                <p>4. Required scopes: <code className="bg-gray-100 px-1 rounded text-xs">read_orders, write_orders</code></p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
