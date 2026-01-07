import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Switch } from './ui/switch';
import { Skeleton } from './ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Search, RefreshCw, UserPlus, Trash2, Settings, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { userAPI, type User } from '../services/leancloud';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // 创建用户对话框状态
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    username: '',
    canPublish: true,
    canComment: true
  });

  // 修改权限对话框状态
  const [editPermissionsDialogOpen, setEditPermissionsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState({
    canPublish: true,
    canComment: true
  });
  const [updatingPermissions, setUpdatingPermissions] = useState(false);

  // 删除用户对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 加载数据
  useEffect(() => {
    loadData();
  }, [currentPage, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 加载用户数据
      const usersData = await userAPI.getList(currentPage, 20);
      setUsers(usersData);
    } catch (error) {
      console.error('加载用户数据失败:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // 创建用户
  const handleCreateUser = async () => {
    if (!newUserData.email.trim()) {
      toast.error('Please enter email address');
      return;
    }

    try {
      setCreatingUser(true);
      // 如果username为空字符串，则不发送该字段
      const userDataToSend = {
        email: newUserData.email.trim(),
        ...(newUserData.username?.trim() ? { username: newUserData.username.trim() } : {}),
        canPublish: newUserData.canPublish,
        canComment: newUserData.canComment
      };
      await userAPI.createUser(userDataToSend);

      toast.success('User created successfully!');

      // 重置表单
      setNewUserData({
        email: '',
        username: '',
        canPublish: true,
        canComment: true
      });

      // 关闭对话框
      setCreateUserDialogOpen(false);

      // 重新加载用户列表
      loadData();
    } catch (error) {
      console.error('创建用户失败:', error);
      toast.error('Failed to create user: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setCreatingUser(false);
    }
  };

  // 打开修改权限对话框
  const handleOpenEditPermissions = (user: User) => {
    setEditingUser(user);
    setPermissions({
      canPublish: user.canPublish !== false,
      canComment: user.canComment !== false
    });
    setEditPermissionsDialogOpen(true);
  };

  // 修改用户权限
  const handleUpdatePermissions = async () => {
    if (!editingUser) return;

    try {
      setUpdatingPermissions(true);
      await userAPI.updatePermissions(editingUser.id, permissions);

      toast.success('User permissions updated successfully!');
      setEditPermissionsDialogOpen(false);
      setEditingUser(null);
      loadData();
    } catch (error) {
      console.error('修改用户权限失败:', error);
      toast.error('Failed to update user permissions: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUpdatingPermissions(false);
    }
  };

  // 打开删除用户对话框
  const handleOpenDeleteDialog = (user: User) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  // 删除用户
  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      setDeleting(true);
      await userAPI.deleteUser(deletingUser.id);

      toast.success('User deleted successfully!');
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      loadData();
    } catch (error) {
      console.error('删除用户失败:', error);
      toast.error('Failed to delete user: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  };

  // 本地搜索（API已经支持服务端搜索，这里作为额外过滤）
  const filteredUsers = users.filter(user =>
    !searchTerm ||
    (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1>User Management</h1>
          <p className="text-muted-foreground mt-1">Loading data...</p>
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>User Management</h1>
          <p className="text-muted-foreground mt-1">Manage user permissions and view user data</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account. Users will log in via email OTP verification.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    Username
                  </Label>
                  <Input
                    id="username"
                    placeholder="Optional, leave empty to use email prefix"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, username: e.target.value }))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Permissions</Label>
                  <div className="col-span-3 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="canPublish"
                        checked={newUserData.canPublish}
                        onCheckedChange={(checked) =>
                          setNewUserData(prev => ({ ...prev, canPublish: checked as boolean }))
                        }
                      />
                      <Label htmlFor="canPublish" className="text-sm">Allow to publish videos</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="canComment"
                        checked={newUserData.canComment}
                        onCheckedChange={(checked) =>
                          setNewUserData(prev => ({ ...prev, canComment: checked as boolean }))
                        }
                      />
                      <Label htmlFor="canComment" className="text-sm">Allow to comment</Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateUserDialogOpen(false)}
                  disabled={creatingUser}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} disabled={creatingUser}>
                  {creatingUser ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* 修改权限对话框 */}
      <Dialog open={editPermissionsDialogOpen} onOpenChange={setEditPermissionsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modify User Permissions</DialogTitle>
            <DialogDescription>
              Modify permissions for user <strong>{editingUser?.username || editingUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Permissions</Label>
              <div className="col-span-3 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="editCanPublish"
                    checked={permissions.canPublish}
                    onCheckedChange={(checked) =>
                      setPermissions(prev => ({ ...prev, canPublish: checked as boolean }))
                    }
                  />
                  <Label htmlFor="editCanPublish" className="text-sm font-normal cursor-pointer">
                    Allow to publish videos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="editCanComment"
                    checked={permissions.canComment}
                    onCheckedChange={(checked) =>
                      setPermissions(prev => ({ ...prev, canComment: checked as boolean }))
                    }
                  />
                  <Label htmlFor="editCanComment" className="text-sm font-normal cursor-pointer">
                    Allow to comment
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditPermissionsDialogOpen(false);
                setEditingUser(null);
              }}
              disabled={updatingPermissions}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdatePermissions} disabled={updatingPermissions}>
              {updatingPermissions ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by username or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Registration Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  {searchTerm ? '未找到匹配的用户' : '暂无用户数据'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{user.username?.[0] || user.email?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <span>{user.username || 'Username not set'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={user.canPublish !== false ? "default" : "secondary"} className="w-fit">
                        {user.canPublish !== false ? 'Can Publish' : 'Cannot Publish'}
                      </Badge>
                      <Badge variant={user.canComment !== false ? "default" : "secondary"} className="w-fit">
                        {user.canComment !== false ? 'Can Comment' : 'Cannot Comment'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleOpenEditPermissions(user)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Modify Permissions
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleOpenDeleteDialog(user)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 删除用户确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialogOpen(false);
          setDeletingUser(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete user <strong>{deletingUser?.username || deletingUser?.email}</strong>?
              This action cannot be undone and will permanently delete the user and all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => {
              setDeleteDialogOpen(false);
              setDeletingUser(null);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
