export type CommandCategory = 'navigation' | 'project' | 'task' | 'workspace' | 'preferences';

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  keywords: string[];
  shortcut?: string;
  icon?: string;
}

export interface CommandGroup {
  category: CommandCategory;
  title: string;
  commands: CommandAction[];
}
