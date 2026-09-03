import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Edit2, Trash2, Check, Loader2, AlertCircle } from 'lucide-react';
import { CommentItem } from '@taskflow/shared';
import { commentApi } from '../../lib/api';
import { formatRelativeTime } from '../../lib/activityFormatter';

interface TaskCommentsSectionProps {
  organizationId: string;
  projectId: string;
  taskId: string;
  currentUserId: string;
  canComment: boolean;
  onActivityChanged?: () => void;
}

export const TaskCommentsSection: React.FC<TaskCommentsSectionProps> = ({
  organizationId,
  projectId,
  taskId,
  currentUserId,
  canComment,
  onActivityChanged,
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Composer state
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [taskId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await commentApi.listComments(organizationId, projectId, taskId);
      setComments(data);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newContent.trim()) return;

    try {
      setSubmitting(true);
      setSubmitError(null);
      const created = await commentApi.createComment(organizationId, projectId, taskId, {
        content: newContent.trim(),
      });
      setComments(prev => [...prev, created]);
      setNewContent('');
      if (onActivityChanged) onActivityChanged();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setSubmitError(apiErr.message || 'Failed to post comment. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCreateComment();
    }
  };

  const handleStartEdit = (comment: CommentItem) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
    setEditError(null);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) {
      setEditError('Comment cannot be empty');
      return;
    }

    try {
      setUpdating(true);
      setEditError(null);
      const updated = await commentApi.updateComment(organizationId, projectId, taskId, commentId, {
        content: editContent.trim(),
      });
      setComments(prev => prev.map(c => (c.id === commentId ? updated : c)));
      setEditingId(null);
      setEditContent('');
      if (onActivityChanged) onActivityChanged();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setEditError(apiErr.message || 'Failed to update comment');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentApi.deleteComment(organizationId, projectId, taskId, commentId);
      setComments(prev =>
        prev.map(c =>
          c.id === commentId ? { ...c, isDeleted: true, content: 'This comment was deleted.' } : c
        )
      );
      setDeletingId(null);
      if (onActivityChanged) onActivityChanged();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to delete comment');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Comments</h3>
          <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-800 text-slate-300 rounded-full">
            {comments.length}
          </span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-6 text-slate-400 text-xs">
          <Loader2 className="w-4 h-4 animate-spin mr-2 text-cyan-400" />
          <span>Loading discussion...</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadComments}
            className="text-cyan-400 hover:underline text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && comments.length === 0 && (
        <div className="text-center py-8 px-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300">No comments yet</p>
          <p className="text-xs text-slate-500 mt-1">Start the conversation with your team.</p>
        </div>
      )}

      {/* Comment Conversation Thread */}
      {!loading && comments.length > 0 && (
        <div className="space-y-3">
          {comments.map(comment => {
            const isAuthor = comment.authorId === currentUserId;
            const isEditing = editingId === comment.id;
            const isConfirmingDelete = deletingId === comment.id;
            const wasEdited =
              !comment.isDeleted &&
              new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000;

            return (
              <div
                key={comment.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  comment.isDeleted
                    ? 'bg-slate-950/30 border-slate-800/50 opacity-75'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Author row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                      {comment.author?.name ? comment.author.name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="text-xs font-semibold text-slate-200">
                      {comment.author?.name || 'Unknown User'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                    {wasEdited && (
                      <span className="text-[10px] text-slate-500 italic">(edited)</span>
                    )}
                  </div>

                  {/* Actions for active comment */}
                  {!comment.isDeleted && !isEditing && (
                    <div className="flex items-center gap-1">
                      {isAuthor && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(comment)}
                          className="p-1 text-slate-400 hover:text-cyan-400 transition-colors rounded"
                          title="Edit comment"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(isAuthor || canComment) && (
                        <button
                          type="button"
                          onClick={() => setDeletingId(comment.id)}
                          className="p-1 text-slate-400 hover:text-red-400 transition-colors rounded"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Body or Inline Edit Mode */}
                {isEditing ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                    />
                    {editError && <p className="text-[11px] text-red-400">{editError}</p>}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={updating || !editContent.trim()}
                        className="flex items-center gap-1 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
                      >
                        {updating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {comment.isDeleted ? (
                      <span className="italic text-slate-500">{comment.content}</span>
                    ) : (
                      comment.content
                    )}
                  </div>
                )}

                {/* Compact Delete Confirmation */}
                {isConfirmingDelete && (
                  <div className="mt-2.5 p-2 bg-red-950/40 border border-red-800/60 rounded-lg flex items-center justify-between">
                    <span className="text-[11px] text-red-300">Delete this comment?</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="text-[11px] text-slate-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-semibold transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Comment Composer */}
      {canComment ? (
        <form onSubmit={handleCreateComment} className="space-y-2 pt-2">
          <div className="relative">
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a comment... (Ctrl+Enter to post)"
              rows={3}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none"
            />
          </div>

          {submitError && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{submitError}</span>
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">
              Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">Ctrl</kbd> +{' '}
              <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">Enter</kbd> to submit
            </span>
            <button
              type="submit"
              disabled={submitting || !newContent.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-medium rounded-lg shadow-md shadow-cyan-500/10 disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Comment</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-slate-500 italic text-center py-2">
          You have view-only access to this project.
        </p>
      )}
    </div>
  );
};
