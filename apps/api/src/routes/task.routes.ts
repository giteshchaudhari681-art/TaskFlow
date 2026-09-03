import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  listTasks,
  createTask,
  getTask,
  updateTask,
  updateTaskStatus,
  archiveTask,
  unarchiveTask,
  deleteTask,
  listSubtasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
} from '../controllers/task.controller.js';
import { assignTaskLabel, removeTaskLabel } from '../controllers/label.controller.js';
import {
  getTaskDependencies,
  createDependency,
  deleteDependency,
} from '../controllers/dependency.controller.js';
import {
  listComments,
  createComment,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller.js';
import { getTaskActivity } from '../controllers/activity.controller.js';

export const taskRoutes = Router({ mergeParams: true });

taskRoutes.use(requireAuth);

// Task CRUD and lifecycle endpoints
taskRoutes.get('/', listTasks);
taskRoutes.post('/', createTask);
taskRoutes.get('/:taskId', getTask);
taskRoutes.patch('/:taskId', updateTask);
taskRoutes.patch('/:taskId/status', updateTaskStatus);
taskRoutes.delete('/:taskId', deleteTask);
taskRoutes.post('/:taskId/archive', archiveTask);
taskRoutes.post('/:taskId/unarchive', unarchiveTask);

// Task Label endpoints
taskRoutes.post('/:taskId/labels', assignTaskLabel);
taskRoutes.delete('/:taskId/labels/:labelId', removeTaskLabel);

// Subtask endpoints
taskRoutes.get('/:taskId/subtasks', listSubtasks);
taskRoutes.post('/:taskId/subtasks', createSubtask);
taskRoutes.patch('/:taskId/subtasks/:subtaskId', updateSubtask);
taskRoutes.delete('/:taskId/subtasks/:subtaskId', deleteSubtask);

// Task Dependency endpoints
taskRoutes.get('/:taskId/dependencies', getTaskDependencies);
taskRoutes.post('/:taskId/dependencies', createDependency);
taskRoutes.delete('/:taskId/dependencies/:dependencyId', deleteDependency);

// Task Comment endpoints
taskRoutes.get('/:taskId/comments', listComments);
taskRoutes.post('/:taskId/comments', createComment);
taskRoutes.patch('/:taskId/comments/:commentId', updateComment);
taskRoutes.delete('/:taskId/comments/:commentId', deleteComment);

// Task Activity endpoint
taskRoutes.get('/:taskId/activity', getTaskActivity);
