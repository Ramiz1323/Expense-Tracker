"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Users, 
  ArrowRight, 
  Trash2, 
  Receipt, 
  Share2, 
  Crown 
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Member {
  _id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
}

interface Group {
  _id: string;
  name: string;
  members: Member[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");

  useEffect(() => {
    const init = async () => {
      await fetchUser();
      await fetchGroups();
    };
    init();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(data.user.id);
      }
    } catch (e) { console.error(e); }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
        toast.success("Group created successfully!");
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
    e.preventDefault();
    e.stopPropagation(); // Stop card click
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

  // --- CALCULATIONS ---
  const totalGroups = groups.length;
  const createdByMe = groups.filter(g => g.createdBy === currentUserId).length;
  
  // Calculate unique friends (excluding self)
  const uniqueFriends = new Set();
  groups.forEach(g => {
    g.members.forEach(m => {
      if (m._id !== currentUserId) uniqueFriends.add(m.email);
    });
  });
  const totalFriends = uniqueFriends.size;

  if (loading) return <div className="p-8">Loading Groups...</div>;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex-1 space-y-6 p-4 sm:p-6 pb-20">
        
        {/* HEADER */}
        <div className="bg-linear-to-r from-pink-600 to-rose-600 p-6 rounded-2xl shadow-lg text-white mb-4">
          <div className="flex items-center gap-3">
             <Receipt className="w-8 h-8 text-white/80" />
             <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Split Bills</h1>
                <p className="text-sm mt-1 opacity-90">Manage shared expenses with friends</p>
             </div>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:snap-none no-scrollbar">
          {[
            { label: "Total Groups", value: totalGroups, icon: <Users className="w-4 h-4 text-pink-500"/> },
            { label: "Created by You", value: createdByMe, icon: <Crown className="w-4 h-4 text-rose-500"/> },
            { label: "Friends Involved", value: totalFriends, icon: <Share2 className="w-4 h-4 text-orange-500"/> },
          ].map((item, i) => (
            <div key={i} className="min-w-60 sm:min-w-0 snap-start backdrop-blur-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                 {item.icon}
                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white whitespace-nowrap">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* ACTIONS & HEADING */}
        <div className="flex justify-between items-center mt-6">
          <h2 className="text-xl font-semibold">Your Groups</h2>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Button onClick={() => setIsOpen(true)} className="rounded-xl shadow-md bg-pink-600 hover:bg-pink-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">New Group</span><span className="sm:hidden">Add</span>
            </Button>
            
            <DialogContent className="rounded-2xl sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Shared Group</DialogTitle>
                <DialogDescription>Add a name and invite friends via email.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input 
                    placeholder="e.g. Goa Trip, Apartment 302..." 
                    value={newGroupName} 
                    onChange={e => setNewGroupName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Add Members</Label>
                  <Input 
                    placeholder="friend@email.com, roommate@email.com" 
                    value={inviteEmails} 
                    onChange={e => setInviteEmails(e.target.value)} 
                  />
                  <p className="text-xs text-muted-foreground">Comma separated emails of registered users</p>
                </div>
                <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700 text-white">
                  Create Group
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* GROUP LIST */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link href={`/dashboard/groups/${group._id}`} key={group._id}>
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer h-full border-slate-200 dark:border-slate-800 relative group overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="flex justify-between items-start">
                    <span className="truncate pr-8 text-lg">{group.name}</span>
                    
                    {/* Delete Button (Only for creator) */}
                    {currentUserId === group.createdBy && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteGroup(group._id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Group</TooltipContent>
                      </Tooltip>
                    )}
                  </CardTitle>
                  
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">
                      {group.members.length} members
                    </span>
                    <span className="text-xs text-slate-400">
                      • Updated {new Date(group.updatedAt).toLocaleDateString()}
                    </span>
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="flex justify-between items-end">
                    {/* Member Avatars */}
                    <div className="flex -space-x-2 overflow-hidden py-1">
                      {group.members.slice(0, 5).map((member) => (
                        <Tooltip key={member._id}>
                          <TooltipTrigger asChild>
                            <Avatar className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900">
                              <AvatarImage src={member.avatarUrl} />
                              <AvatarFallback className="text-[10px] bg-slate-200 dark:bg-slate-800">
                                {member.fullName?.charAt(0) || member.email.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>{member.fullName || member.email}</TooltipContent>
                        </Tooltip>
                      ))}
                      {group.members.length > 5 && (
                         <div className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-500">
                           +{group.members.length - 5}
                         </div>
                      )}
                    </div>

                    <div className="flex items-center text-sm text-pink-600 dark:text-pink-400 font-medium group-hover:translate-x-1 transition-transform">
                      Open <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          
          {groups.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-xs mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">No groups found</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                Create a group to start splitting bills, rent, or trip expenses with your friends.
              </p>
              <Button onClick={() => setIsOpen(true)} variant="outline" className="border-pink-200 hover:bg-pink-50 text-pink-700 dark:border-pink-900 dark:hover:bg-pink-900/20 dark:text-pink-400">
                Create your first group
              </Button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}