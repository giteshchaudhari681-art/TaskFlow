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

// Subtask endpoints
taskRoutes.get('/:taskId/subtasks', listSubtasks);
taskRoutes.post('/:taskId/subtasks', createSubtask);
taskRoutes.patch('/:taskId/subtasks/:subtaskId', updateSubtask);
taskRoutes.delete('/:taskId/subtasks/:subtaskId', deleteSubtask);
