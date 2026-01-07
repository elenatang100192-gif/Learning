export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Publication {
  id: string;
  title: string;
  category: 'Tech' | 'Arts' | 'Business';
  thumbnail: string;
  videoUrl: string;
  status: ReviewStatus;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  author: string;
  authorEmail: string;
}

