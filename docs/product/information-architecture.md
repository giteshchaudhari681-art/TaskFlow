# TaskFlow — Information Architecture & Domain Model

## Structural Hierarchy

```
Organization (Workspace Tenant)
│
├── Organization Members & Role-Based Access Control
│
├── Projects (Autonomous Workstreams)
│   ├── Milestones (Time-bound Delivery Targets)
│   ├── Objectives (Key Results / High-level Goals)
│   ├── Tasks (Primary Units of Execution)
│   │   ├── Subtasks (Checklists & Granular Steps)
│   │   ├── Task Dependencies (Directed Acyclic Graph: BLOCKS, BLOCKED_BY)
│   │   ├── Comments & Discussion Threads
│   │   ├── Attachments & Media Assets
│   │   └── Activity Logs (Audit Trail)
│   └── Project Insights (AI Risk Assessments & Health Metrics)
│
├── My Work (Personal Execution Command Center)
│   ├── My Day (Curated Daily Focus Queue)
│   ├── Assigned Tasks (Active, Review, Blocked)
│   └── Mentions & Notifications
│
└── Project Intelligence Center (Analytics & Proactive Oversight)
    ├── Critical Path Analyzer
    ├── Velocity & Workload Distribution
    ├── Risk Radar
    └── AI Assistant Workflows
```

## Navigation Model

- **Primary Sidebar**: Collapsible workspace switcher, Global Search (`Cmd/Ctrl+K`), My Work, Projects list, Intelligence Dashboard, Settings.
- **Project Navigation**: Overview, Board (Kanban), List, Timeline (Gantt/Dependency DAG), Milestones, Files, Analytics.
- **Task Workspace Drawer/Modal**: Deep task inspection with inline status/priority controls, dependency relationship manager, threaded discussions, activity history.
