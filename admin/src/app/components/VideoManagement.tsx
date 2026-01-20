import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { Search, Play, Eye, ThumbsUp, Clock, CheckCircle, XCircle, Ban, Upload, Power, FileVideo, Image as ImageIcon, RefreshCw, Trash2, Edit, ArrowUpDown } from 'lucide-react';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { videoAPI, categoryAPI, bookAPI, type Video, type Category } from '../services/leancloud';

export function VideoManagement() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isVideoPlayerDialogOpen, setIsVideoPlayerDialogOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editingCategory, setEditingCategory] = useState<string>('');
  const [isEditOrderDialogOpen, setIsEditOrderDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('all');
  
  // 后台发布表单状态
  const [publishFormData, setPublishFormData] = useState({
    language: 'zh' as 'zh' | 'en', // 发布语言：中文或英文
    title: '',
    category: '科技' as string,
    coverUrl: ''
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedCoverImage, setUploadedCoverImage] = useState<File | null>(null);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string>('');

  // 加载数据
  useEffect(() => {
    loadData();
  }, [currentPage, searchTerm, activeTab]);

  // 自动刷新机制：在"待审核"标签页每5秒自动刷新一次
  // 注意：当审核对话框打开时，暂停自动刷新，避免关闭对话框
  // 已禁用自动刷新，避免频繁刷新影响用户体验
  // useEffect(() => {
  //   if (activeTab === '待审核' && !isReviewDialogOpen) {
  //     console.log('🔄 启动待审核列表自动刷新（每5秒）');
  //     // 立即加载一次
  //     loadData();
  //     // 然后每5秒刷新一次
  //     const interval = setInterval(() => {
  //       console.log('🔄 自动刷新待审核列表...');
  //       loadData();
  //     }, 5000); // 5秒刷新一次，确保新发布的视频能及时显示

  //     return () => {
  //       console.log('🛑 停止待审核列表自动刷新');
  //       clearInterval(interval);
  //     };
  //   }
  // }, [activeTab, currentPage, searchTerm, isReviewDialogOpen]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 根据当前tab构建查询条件
      const filters: any = {};
      if (searchTerm) {
        filters.title = searchTerm;
      }

      // 根据tab设置status过滤
      if (activeTab === '待审核') {
        filters.status = '待审核';
      } else if (activeTab === '已发布') {
        filters.status = '已发布';
      } else if (activeTab === '已驳回') {
        filters.status = '已驳回';
      } else if (activeTab === '待提取') {
        filters.status = '待提取';
      }
      // 对于'all'和'disabled'，不设置status过滤，让后端处理

      console.log('📋 加载视频列表，过滤条件:', filters, '页码:', currentPage);

      // 并行加载视频和分类数据
      const [videosData, categoriesData] = await Promise.all([
        videoAPI.getList(filters, currentPage, 20),
        categoryAPI.getAll()
      ]);

      console.log(`✅ 加载完成，获取到 ${videosData.length} 个视频`);
      if (activeTab === '待审核' && videosData.length > 0) {
        console.log('📹 待审核视频列表:', videosData.map(v => ({ id: v.id, title: v.title, status: v.status })));
      }

      setVideos(videosData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('❌ 加载数据失败:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVideo) return;

    try {
      await videoAPI.review(selectedVideo.id, 'approve');
      setSelectedVideo(null);
      setIsReviewDialogOpen(false);
      setReviewNotes('');
      toast.success('Video published');
      loadData(); // 重新加载数据
    } catch (error) {
      console.error('审核失败:', error);
      toast.error('Review failed');
    }
  };

  const handleReject = async () => {
    if (!selectedVideo || !reviewNotes) {
      toast.error('Please provide rejection reason');
      return;
    }

    try {
      await videoAPI.review(selectedVideo.id, 'reject', reviewNotes);
      setSelectedVideo(null);
      setIsReviewDialogOpen(false);
      setReviewNotes('');
      toast.success('Video rejected');
      loadData(); // 重新加载数据
    } catch (error) {
      console.error('驳回失败:', error);
      toast.error('Rejection failed');
    }
  };

  const handleDisable = async (videoId: string) => {
    try {
      await videoAPI.toggleStatus(videoId, true);
      toast.success('Video disabled, will not be displayed on frontend');
      loadData(); // 重新加载数据
    } catch (error) {
      console.error('禁用失败:', error);
      toast.error('Disable failed');
    }
  };

  const handleEnable = async (videoId: string) => {
    try {
      await videoAPI.toggleStatus(videoId, false);
      toast.success('Video enabled');
      loadData(); // 重新加载数据
    } catch (error) {
      console.error('启用失败:', error);
      toast.error('Enable failed');
    }
  };

  // 获取视频时长
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      
      video.onerror = () => {
        reject(new Error('无法读取视频文件'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      return;
    }

    setUploadedFile(file);
    
    // 获取视频时长
    try {
      const duration = await getVideoDuration(file);
      setVideoDuration(Math.round(duration));
      console.log('视频时长:', duration, '秒');
    } catch (error) {
      console.error('获取视频时长失败:', error);
      setVideoDuration(0);
    }

    // 自动填充视频标题（从文件名）
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    if (!publishFormData.title) {
      setPublishFormData({ ...publishFormData, title: fileName });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleCoverImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadedCoverImage(file);
    
    // 创建预览URL
    const previewUrl = URL.createObjectURL(file);
    setCoverPreviewUrl(previewUrl);
    setPublishFormData({ ...publishFormData, coverUrl: previewUrl });
    
    toast.success(`Cover image uploaded: ${file.name}`);
  };

  const handleCoverDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCover(true);
  };

  const handleCoverDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCover(false);
  };

  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCover(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleCoverImageUpload(files[0]);
    }
  };

  const handleCoverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleCoverImageUpload(files[0]);
    }
  };

  const removeCoverImage = () => {
    setUploadedCoverImage(null);
    setCoverPreviewUrl('');
    setPublishFormData({ ...publishFormData, coverUrl: '' });
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }
  };

  const handleBackendPublish = async () => {
    const { language, title, category, coverUrl } = publishFormData;

    if (!title) {
      toast.error('Please enter video title');
      return;
    }

    if (!uploadedFile) {
      toast.error('Please upload a video file');
      return;
    }

    try {
      const categoryObj = categories.find(cat => cat.nameCn === category);
      if (!categoryObj) {
        toast.error('Please select a valid category');
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      // 上传视频文件（带进度条）
      const videoUploadResult = await videoAPI.uploadVideo(uploadedFile, (progress) => {
        setUploadProgress(progress);
      });

      // 上传封面图片（如果有）
      let finalCoverUrl = coverUrl;
      if (uploadedCoverImage) {
        const coverUploadResult = await videoAPI.uploadCover(uploadedCoverImage);
        finalCoverUrl = coverUploadResult.url;
      }

      // 发布视频
      const videoData: any = {
        title: language === 'zh' ? title : '',
        titleEn: language === 'en' ? title : '',
        categoryId: categoryObj.id,
        duration: videoDuration,
      };

      // 根据语言设置videoUrl或videoUrlEn
      if (language === 'zh') {
        videoData.videoUrl = videoUploadResult.url;
      } else {
        videoData.videoUrlEn = videoUploadResult.url;
      }

      if (finalCoverUrl) {
        videoData.coverUrl = finalCoverUrl;
      }

      await videoAPI.publish(videoData);
      
      setIsPublishDialogOpen(false);
      setIsUploading(false);
      setUploadProgress(0);

      // 清理表单状态
      setPublishFormData({
        language: 'zh',
        title: '',
        category: '科技',
        coverUrl: ''
      });
      setUploadedFile(null);
      setVideoDuration(0);
      setUploadedCoverImage(null);
      setCoverPreviewUrl('');

      toast.success('Video submitted to review queue');
      loadData(); // 重新加载数据
    } catch (error: any) {
      console.error('发布失败:', error);
      toast.error(error.message || 'Publish failed');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // 修改视频分类
  const handleEditCategory = async () => {
    if (!editingVideo || !editingCategory) {
      toast.error('Please select a category');
      return;
    }

    try {
      const categoryObj = categories.find(cat => cat.nameCn === editingCategory);
      if (!categoryObj) {
        toast.error('Please select a valid category');
        return;
      }

      await videoAPI.update(editingVideo.id, { category: categoryObj });
      toast.success('Category updated successfully');
      setIsEditCategoryDialogOpen(false);
      setEditingVideo(null);
      setEditingCategory('');
      loadData(); // 重新加载数据
    } catch (error) {
      console.error('修改分类失败:', error);
      toast.error('Failed to update category');
    }
  };

  // 根据关联书籍自动修正分类
  const handleFixCategoryFromBook = async (video: Video) => {
    if (!video.book?.id) {
      toast.error('This video has no associated book, cannot auto-correct category');
      return;
    }

    try {
      // 获取书籍信息
      const book = await bookAPI.getById(video.book.id);
      if (!book || !book.category) {
        toast.error('Unable to get book category information');
        return;
      }

      // 使用书籍的分类更新视频分类
      const bookCategory = categories.find(cat => cat.id === book.category?.id);
      if (!bookCategory) {
        toast.error('Unable to find corresponding category');
        return;
      }

      await videoAPI.update(video.id, { category: bookCategory });
      toast.success(`Category corrected to: ${bookCategory.nameCn}`);
      loadData(); // 重新加载数据
    } catch (error) {
      console.error('自动修正分类失败:', error);
      toast.error('Failed to auto-correct category');
    }
  };

  // 修改视频显示顺序
  const handleEditOrder = async () => {
    if (!editingVideo || editingOrder < 0) {
      toast.error('Please enter a valid order number (>= 0)');
      return;
    }

    try {
      await videoAPI.update(editingVideo.id, { displayOrder: editingOrder });
      toast.success('Display order updated successfully');
      setIsEditOrderDialogOpen(false);
      setEditingVideo(null);
      setEditingOrder(0);
      loadData(); // 重新加载数据
    } catch (error) {
      console.error('修改显示顺序失败:', error);
      toast.error('Failed to update display order');
    }
  };

  const getStatusBadge = (status: VideoStatus, disabled?: boolean) => {
    if (disabled) {
      return <Badge variant="outline" className="border-gray-500 text-gray-700">Disabled</Badge>;
    }

    const statusMap: Record<VideoStatus, string> = {
      '待提取': 'Pending Extract',
      '待审核': 'Pending Review',
      '已发布': 'Published',
      '已驳回': 'Rejected'
    };

    const config = {
      '待提取': { variant: 'secondary' as const, className: '' },
      '待审核': { variant: 'default' as const, className: 'bg-accent text-accent-foreground' },
      '已发布': { variant: 'outline' as const, className: 'border-green-500 text-green-700' },
      '已驳回': { variant: 'outline' as const, className: 'border-red-500 text-red-700' }
    };

    const { variant, className } = config[status];
    return <Badge variant={variant} className={className}>{statusMap[status] || status}</Badge>;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 安全地获取作者信息（支持字符串或对象）
  const getAuthorDisplay = (author: any): string => {
    if (!author) return '-';
    if (typeof author === 'string') return author;
    if (typeof author === 'object') {
      return author.email || author.username || author.id || '-';
    }
    return '-';
  };

  const filterByTab = (tab: string) => {
    let filtered = videos;
    
    if (tab === 'disabled') {
      filtered = filtered.filter(v => v.status === '已发布' && v.disabled === true);
    } else if (tab === 'all') {
      filtered = filtered.filter(v => !v.disabled);
    } else {
      filtered = filtered.filter(v => v.status === tab && !v.disabled);
    }

    if (searchTerm) {
      filtered = filtered.filter(v =>
        v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.book && v.book.title.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // 按displayOrder排序（升序），displayOrder为undefined/null的排在后面，然后按createdAt排序（降序）
    filtered.sort((a, b) => {
      const orderA = a.displayOrder !== undefined && a.displayOrder !== null ? a.displayOrder : Number.MAX_SAFE_INTEGER;
      const orderB = b.displayOrder !== undefined && b.displayOrder !== null ? b.displayOrder : Number.MAX_SAFE_INTEGER;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // 如果displayOrder相同，按createdAt降序排序（最新的在前）
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    return filtered;
  };

  const pendingCount = videos.filter(v => v.status === '待审核' && !v.disabled).length;
  const disabledCount = videos.filter(v => v.disabled === true).length;

  const renderVideoTable = (tab: string) => {
    const filteredVideos = filterByTab(tab);

    return (
      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Video</TableHead>
              <TableHead>Source Book</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Likes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Display Order</TableHead>
              {tab === 'disabled' && <TableHead>Author</TableHead>}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVideos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tab === 'disabled' ? 10 : 9} className="text-center py-12 text-muted-foreground">
                  No videos available
                </TableCell>
              </TableRow>
            ) : (
              filteredVideos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell>
                    <div className="max-w-[300px]">
                      <p className="truncate">{video.title}</p>
                      <p className="text-xs text-muted-foreground">{video.uploadDate}</p>
                    </div>
                  </TableCell>
                  <TableCell>{video.book?.title || 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{video.category?.name || video.category?.nameCn || 'Uncategorized'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(video.duration)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      {(video.viewCount || 0).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ThumbsUp className="h-3 w-3" />
                      {(video.likeCount || 0).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(video.status, video.disabled)}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {video.displayOrder !== undefined ? video.displayOrder : '-'}
                    </span>
                  </TableCell>
                  {tab === 'disabled' && (
                    <TableCell>
                      <span className="text-muted-foreground">{getAuthorDisplay(video.author)}</span>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex gap-2">
                      {/* 修改分类按钮 */}
                      <Dialog open={isEditCategoryDialogOpen && editingVideo?.id === video.id} onOpenChange={(open) => {
                        setIsEditCategoryDialogOpen(open);
                        if (!open) {
                          setEditingVideo(null);
                          setEditingCategory('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingVideo(video);
                              setEditingCategory(video.category?.nameCn || '');
                              setIsEditCategoryDialogOpen(true);
                            }}
                            className="hover:bg-accent hover:text-accent-foreground"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit Category
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Video Category</DialogTitle>
                            <DialogDescription>
                              Edit category for video "{video.title}"
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            {video.book?.title && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Associated Book: {video.book.title}</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleFixCategoryFromBook(video)}
                                  className="mt-2"
                                >
                                  使用书籍分类
                                </Button>
                              </div>
                            )}
                            <div className="space-y-2">
                              <Label>Select Category</Label>
                              <Select 
                                value={editingCategory} 
                                onValueChange={setEditingCategory}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from(new Map(categories.map(cat => [cat.nameCn, cat])).values()).map((category) => (
                                    <SelectItem key={category.id} value={category.nameCn}>
                                      {category.name || category.nameCn}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsEditCategoryDialogOpen(false);
                                setEditingVideo(null);
                                setEditingCategory('');
                              }}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleEditCategory}>
                              Save
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {/* 修改显示顺序按钮 */}
                      <Dialog open={isEditOrderDialogOpen && editingVideo?.id === video.id} onOpenChange={(open) => {
                        setIsEditOrderDialogOpen(open);
                        if (!open) {
                          setEditingVideo(null);
                          setEditingOrder(0);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // 计算当前视频在排序列表中的实际位置（从1开始）
                              const filteredVideos = filterByTab(tab);
                              const currentIndex = filteredVideos.findIndex(v => v.id === video.id);
                              
                              setEditingVideo(video);
                              // 如果video有displayOrder，使用它；否则使用当前排序位置（从1开始）
                              if (video.displayOrder !== undefined && video.displayOrder !== null) {
                                setEditingOrder(video.displayOrder);
                              } else {
                                // 使用当前在排序列表中的位置（从1开始）
                                setEditingOrder(currentIndex >= 0 ? currentIndex + 1 : filteredVideos.length + 1);
                              }
                              setIsEditOrderDialogOpen(true);
                            }}
                            className="hover:bg-accent hover:text-accent-foreground"
                          >
                            <ArrowUpDown className="h-3 w-3 mr-1" />
                            Edit Order
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Display Order</DialogTitle>
                            <DialogDescription>
                              Set the display order for video "{video.title}" on mobile frontend. Lower numbers appear first.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Display Order</Label>
                              <Input
                                type="number"
                                min="0"
                                value={editingOrder}
                                onChange={(e) => setEditingOrder(parseInt(e.target.value) || 0)}
                                placeholder="Enter order number (0, 1, 2, ...)"
                              />
                              <p className="text-xs text-muted-foreground">
                                Videos with lower order numbers will appear first on the mobile frontend. Current order: {video.displayOrder !== undefined && video.displayOrder !== null ? video.displayOrder : 'Not set (will appear after ordered videos)'}
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsEditOrderDialogOpen(false);
                                setEditingVideo(null);
                                setEditingOrder(0);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleEditOrder}>
                              Save
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {video.status === '待审核' && (
                        <Dialog open={isReviewDialogOpen && selectedVideo?.id === video.id} onOpenChange={(open) => {
                          setIsReviewDialogOpen(open);
                          if (!open) {
                            setSelectedVideo(null);
                            setReviewNotes('');
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedVideo(video);
                                setReviewNotes('');
                                setIsReviewDialogOpen(true);
                              }}
                              className="hover:bg-accent hover:text-accent-foreground"
                            >
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Video Review</DialogTitle>
                              <DialogDescription>Review video content and quality</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                <video
                                  controls
                                  className="w-full h-full"
                                  src={video.videoUrlEn || video.videoUrl}
                                  poster={video.coverUrl}
                                >
                                  Your browser does not support video playback.
                                </video>
                              </div>
                              <div>
                                <h3>{video.title}</h3>
                                <p className="text-muted-foreground mt-1">Source: {video.book?.title || 'None'}</p>
                                {video.author && (
                                  <p className="text-muted-foreground mt-1">
                                    Publisher: <span className="text-accent">{getAuthorDisplay(video.author)}</span>
                                  </p>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                                <div>
                                  <p className="text-muted-foreground">Category</p>
                                    <p className="mt-1">{video.category?.name || video.category?.nameCn || 'Uncategorized'}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Duration</p>
                                  <p className="mt-1">{formatDuration(video.duration)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">AI Extraction Date</p>
                                  <p className="mt-1">{video.aiExtractDate}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Review Notes</Label>
                                <Textarea
                                  placeholder="Enter review comments or rejection reason..."
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  onClick={handleApprove}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve & Publish
                                </Button>
                                <Button 
                                  onClick={handleReject}
                                  variant="outline"
                                  className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      {video.status === '已发布' && !video.disabled && (
                        <>
                          <Dialog open={isVideoPlayerDialogOpen && playingVideo?.id === video.id} onOpenChange={(open) => {
                            setIsVideoPlayerDialogOpen(open);
                            if (!open) {
                              setPlayingVideo(null);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setPlayingVideo(video);
                                  setIsVideoPlayerDialogOpen(true);
                                }}
                                className="hover:bg-accent hover:text-accent-foreground"
                              >
                                <Play className="h-4 w-4 mr-2" />
                                View Video
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>{video.title}</DialogTitle>
                                <DialogDescription>
                                  {video.book?.title && `Source: ${video.book.title}`}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                  <video
                                    controls
                                    className="w-full h-full"
                                    src={video.videoUrlEn || video.videoUrl}
                                    poster={video.coverUrl}
                                  >
                                    Your browser does not support video playback.
                                  </video>
                                </div>
                                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                                  <div>
                                    <p className="text-muted-foreground">Category</p>
                                    <p className="mt-1">{video.category?.name || video.category?.nameCn || 'Uncategorized'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Duration</p>
                                    <p className="mt-1">{formatDuration(video.duration)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Status</p>
                                    <div className="mt-1">
                                      {getStatusBadge(video.status, video.disabled)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDisable(video.id)}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <Ban className="mr-1 h-3 w-3" />
                            Disable
                          </Button>
                        </>
                      )}
                      {video.disabled && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEnable(video.id)}
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <Power className="mr-1 h-3 w-3" />
                          Enable
                        </Button>
                      )}
                      {video.status !== '已发布' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete video "${video.title}"? This action cannot be undone.`)) {
                              try {
                                await videoAPI.delete(video.id);
                                toast.success('Delete successful');
                                loadData();
                              } catch (error) {
                                console.error('删除失败:', error);
                                toast.error('Delete failed, please try again');
                              }
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1>Video Management</h1>
          <p className="text-muted-foreground mt-1">Loading data...</p>
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="w-24 h-16 rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Video Management</h1>
          <p className="text-muted-foreground mt-1">Manage and review video content</p>
        </div>

        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90">
              <Upload className="mr-2 h-4 w-4" />
              Backend Publish
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[600px] max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Publish Video from Backend</DialogTitle>
              <DialogDescription>Publish video content directly by administrator, will enter review queue after publishing</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto pr-2">
              {/* 语言选择 */}
              <div className="space-y-2">
                <Label>Publish Language *</Label>
                <Select 
                  value={publishFormData.language} 
                  onValueChange={(value: 'zh' | 'en') => setPublishFormData({ ...publishFormData, language: value, title: '' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh">Chinese</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {publishFormData.language === 'zh' 
                    ? 'Chinese videos will be displayed in the frontend Chinese interface' 
                    : 'English videos will be displayed in the frontend English interface'}
                </p>
              </div>
              
              {/* 视频标题 */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  {publishFormData.language === 'zh' ? 'Video Title (Chinese) *' : 'Video Title (English) *'}
                </Label>
                <Input
                  id="title"
                  placeholder={publishFormData.language === 'zh' ? 'Enter Chinese video title...' : 'Enter English video title...'}
                  value={publishFormData.title}
                  onChange={(e) => setPublishFormData({ ...publishFormData, title: e.target.value })}
                />
              </div>
              
              {/* 分类选择 */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={publishFormData.category} 
                  onValueChange={(value: string) => setPublishFormData({ ...publishFormData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Map(categories.map(cat => [cat.nameCn, cat])).values()).map((category) => (
                      <SelectItem key={category.id} value={category.nameCn}>
                        {category.name || category.nameCn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 上传视频文件 */}
              <div className="space-y-2">
                <Label>Upload Video File *</Label>
                {videoDuration > 0 && (
                  <p className="text-xs text-muted-foreground">Video Duration: {formatDuration(videoDuration)}</p>
                )}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging 
                      ? 'border-accent bg-accent/10' 
                      : 'border-muted-foreground/25 hover:border-accent/50'
                  }`}
                >
                  {uploadedFile ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-3">
                        <div className="p-2 bg-accent/10 rounded-lg flex-shrink-0">
                          <FileVideo className="h-6 w-6 text-accent" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-sm truncate max-w-[280px]">{uploadedFile.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatFileSize(uploadedFile.size)}</p>
                        </div>
                      </div>
                      {isUploading && (
                        <div className="space-y-2">
                          <Progress value={uploadProgress} />
                          <p className="text-xs text-center text-muted-foreground">{uploadProgress}%</p>
                        </div>
                      )}
                      {!isUploading && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUploadedFile(null);
                            setVideoDuration(0);
                          }}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          移除文件
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-center mb-3">
                        <div className="p-3 bg-muted rounded-lg">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="mb-2">Drag video file here, or</p>
                      <label>
                        <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('video-upload')?.click()}>
                          选择文件
                        </Button>
                        <input
                          id="video-upload"
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={handleFileInputChange}
                        />
                      </label>
                      <p className="text-xs text-muted-foreground mt-2">Supports MP4, MOV, AVI formats</p>
                    </>
                  )}
                </div>
              </div>
              
              {/* 上传封面图（非必填） */}
              <div className="space-y-2">
                <Label>Upload Cover Image (Optional)</Label>
                <div
                  onDragOver={handleCoverDragOver}
                  onDragLeave={handleCoverDragLeave}
                  onDrop={handleCoverDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDraggingCover 
                      ? 'border-accent bg-accent/10' 
                      : 'border-muted-foreground/25 hover:border-accent/50'
                  }`}
                >
                  {coverPreviewUrl ? (
                    <div className="space-y-3">
                      <div className="aspect-video bg-muted rounded overflow-hidden">
                        <img 
                          src={coverPreviewUrl} 
                          alt="封面预览"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-muted-foreground truncate max-w-xs">
                          {uploadedCoverImage?.name}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={removeCoverImage}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          移除图片
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-center mb-3">
                        <div className="p-3 bg-muted rounded-lg">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="mb-2">Drag cover image here, or</p>
                      <label>
                        <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('cover-upload')?.click()}>
                          选择图片
                        </Button>
                        <input
                          id="cover-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverInputChange}
                        />
                      </label>
                      <p className="text-xs text-muted-foreground mt-2">Supports JPG, PNG, GIF formats</p>
                    </>
                  )}
                </div>
              </div>
              {publishFormData.coverUrl && (
                <div className="aspect-video bg-muted rounded overflow-hidden">
                  <img 
                    src={publishFormData.coverUrl} 
                    alt="封面预览"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400';
                    }}
                  />
                </div>
              )}
              <div className="bg-accent/10 border border-accent rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  <strong>Publisher:</strong><span className="text-accent">System Administrator</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Videos published from backend will enter the review queue and need to be approved before being published to the frontend.
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleBackendPublish}
                  disabled={isUploading || !uploadedFile || !publishFormData.title}
                  className="flex-1 bg-accent hover:bg-accent/90"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? `Uploading ${uploadProgress}%` : 'Submit to Review Queue'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsPublishDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search video title or book name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="待审核" className="relative">
            Pending Review
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="已发布">Published</TabsTrigger>
          <TabsTrigger value="disabled" className="relative">
            Disabled
            {disabledCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gray-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {disabledCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="待提取">Pending Extract</TabsTrigger>
          <TabsTrigger value="已驳回">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderVideoTable('all')}
        </TabsContent>
        <TabsContent value="待审核" className="mt-6">
          {renderVideoTable('待审核')}
        </TabsContent>
        <TabsContent value="已发布" className="mt-6">
          {renderVideoTable('已发布')}
        </TabsContent>
        <TabsContent value="disabled" className="mt-6">
          {renderVideoTable('disabled')}
        </TabsContent>
        <TabsContent value="待提取" className="mt-6">
          {renderVideoTable('待提取')}
        </TabsContent>
        <TabsContent value="已驳回" className="mt-6">
          {renderVideoTable('已驳回')}
        </TabsContent>
      </Tabs>
    </div>
  );
}