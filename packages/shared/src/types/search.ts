export type SearchEntityType = 'project' | 'task' | 'milestone' | 'user' | 'label';

export interface SearchItemMetadata {
  projectId?: string;
  projectName?: string;
  projectKey?: string;
  taskNumber?: number;
  issueKey?: string;
  status?: string;
  priority?: string;
  assigneeName?: string;
  assigneeAvatar?: string | null;
  dueDate?: string | null;
  color?: string | null;
  email?: string;
  role?: string;
}

export interface SearchResultItem {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string;
  description?: string | null;
  url: string;
  score: number;
  metadata: SearchItemMetadata;
}

export interface SearchCounts {
  projects: number;
  tasks: number;
  milestones: number;
  users: number;
  labels: number;
}

export interface SearchResponse {
  query: string;
  total: number;
  hasMore: boolean;
  results: SearchResultItem[];
  counts: SearchCounts;
}

export interface SearchQueryFilter {
  q: string;
  type?: SearchEntityType | 'all';
  projectId?: string;
  limit?: number;
}
