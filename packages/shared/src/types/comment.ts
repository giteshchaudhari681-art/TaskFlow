export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface CommentItem {
  id: string;
  taskId: string;
  authorId: string | null;
  content: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor | null;
}

export interface CreateCommentPayload {
  content: string;
}

export interface UpdateCommentPayload {
  content: string;
}

export interface DeleteCommentResponse {
  success: boolean;
  commentId: string;
  isDeleted: boolean;
}
