"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");

  useEffect(() => {
    fetchGroups();
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(data.user.id); // Assuming API returns { user: { id: ... } }
      }
    } catch (e) { console.error(e); }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) setGroups(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const emails = inviteEmails.split(',').map(e => e.trim()).filter(e => e);
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, memberEmails: emails }),
      });

      if (res.ok) {
        toast.success("Group created!");
        setIsOpen(false);
        setNewGroupName("");
        setInviteEmails("");
        fetchGroups();
      } else {
        toast.error("Failed to create group");
      }
    } catch (e) {
      toast.error("Error creating group");
    }
  };

  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    if (!confirm("Are you sure? This will delete the group and all its expenses.")) return;

    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Group deleted");
        fetchGroups();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete group");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="bg-linear-to-r from-pink-600 to-rose-600 p-6 rounded-2xl shadow-lg text-white w-full">
          <div className="flex justify-between items-center">
             <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Shared Groups</h1>
                <p className="text-sm mt-1 opacity-90">Split bills and track shared expenses</p>
             </div>
             <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white text-pink-600 hover:bg-slate-100 border-none">
                  <Plus className="h-4 w-4 mr-2" /> New Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a Shared Group</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateGroup} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Group Name</Label>
                    <Input placeholder="Trip to Goa, House Rent, etc." value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Add Members (Emails)</Label>
                    <Input placeholder="friend@example.com, roomie@example.com" value={inviteEmails} onChange={e => setInviteEmails(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Comma separated emails of registered users</p>
                  </div>
                  <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700">Create Group</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group: any) => (
          <Link href={`/dashboard/groups/${group._id}`} key={group._id}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-slate-200 dark:border-slate-800 relative group">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-start">
                  <span>{group.name}</span>
                  {/* Delete Button (Only for creator) */}
                  {currentUserId === group.createdBy && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:bg-red-50 -mt-1 -mr-2"
                      onClick={(e) => handleDeleteGroup(group._id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {group.members.length} Members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-pink-600 dark:text-pink-400 font-medium">
                  View Expenses <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {groups.length === 0 && (
          <div className="col-span-full text-center py-10 text-slate-500">
            No groups yet. Create one to start splitting bills!
          </div>
        )}
      </div>
    </div>
  );
}