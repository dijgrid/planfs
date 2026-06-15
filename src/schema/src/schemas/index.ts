export const taskSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'PlanFS Task',
  type: 'object',
  required: ['id', 'title', 'status'],
  properties: {
    id: {
      type: 'string',
      pattern: '^TASK-[0-9]{3,}$',
      description: 'Unique task identifier'
    },
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
      description: 'Task title'
    },
    status: {
      type: 'string',
      enum: ['todo', 'in-progress', 'review', 'done'],
      description: 'Current task status'
    },
    priority: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'critical'],
      description: 'Task priority level'
    },
    assignee: {
      type: 'string',
      description: 'GitHub username or email of assignee'
    },
    epic: {
      type: 'string',
      pattern: '^EPIC-',
      description: 'Parent epic ID'
    },
    milestone: {
      type: 'string',
      pattern: '^MILESTONE-',
      description: 'Associated milestone ID'
    },
    dependsOn: {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^TASK-'
      },
      description: 'Task IDs this task depends on'
    },
    tags: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'Categorization tags'
    },
    dueDate: {
      type: 'string',
      format: 'date-time',
      description: 'Target completion date (ISO 8601)'
    },
    estimate: {
      type: 'string',
      description: 'Estimated effort (e.g., "2d", "5h")'
    },
    links: {
      type: 'object',
      additionalProperties: {
        type: 'string',
        format: 'uri'
      },
      description: 'External references'
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      description: 'Creation timestamp (ISO 8601)'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      description: 'Last update timestamp (ISO 8601)'
    }
  }
};

export const epicSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'PlanFS Epic',
  type: 'object',
  required: ['id', 'title', 'status'],
  properties: {
    id: {
      type: 'string',
      pattern: '^EPIC-',
      description: 'Unique epic identifier'
    },
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
      description: 'Epic title'
    },
    status: {
      type: 'string',
      enum: ['active', 'completed', 'on-hold', 'archived'],
      description: 'Epic status'
    },
    owner: {
      type: 'string',
      description: 'Epic owner username'
    },
    description: {
      type: 'string',
      description: 'Epic description'
    },
    targetDate: {
      type: 'string',
      format: 'date-time',
      description: 'Target completion date'
    },
    tags: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'Categorization tags'
    },
    links: {
      type: 'object',
      additionalProperties: {
        type: 'string'
      },
      description: 'External references'
    },
    createdAt: {
      type: 'string',
      format: 'date-time'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time'
    }
  }
};

export const milestoneSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'PlanFS Milestone',
  type: 'object',
  required: ['id', 'title', 'targetDate', 'status'],
  properties: {
    id: {
      type: 'string',
      pattern: '^MILESTONE-',
      description: 'Unique milestone identifier'
    },
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
      description: 'Milestone title'
    },
    status: {
      type: 'string',
      enum: ['active', 'completed', 'delayed'],
      description: 'Milestone status'
    },
    targetDate: {
      type: 'string',
      format: 'date-time',
      description: 'Target delivery date (required)'
    },
    description: {
      type: 'string',
      description: 'Milestone description'
    },
    owner: {
      type: 'string',
      description: 'Responsible party'
    },
    links: {
      type: 'object',
      additionalProperties: {
        type: 'string'
      },
      description: 'External references'
    },
    createdAt: {
      type: 'string',
      format: 'date-time'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time'
    }
  }
};

export const decisionSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'PlanFS Decision',
  type: 'object',
  required: ['id', 'title', 'status'],
  properties: {
    id: {
      type: 'string',
      pattern: '^DECISION-',
      description: 'Unique decision identifier'
    },
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
      description: 'Decision title'
    },
    status: {
      type: 'string',
      enum: ['proposed', 'accepted', 'rejected', 'superseded'],
      description: 'Decision status'
    },
    date: {
      type: 'string',
      format: 'date-time',
      description: 'When decision was made'
    },
    context: {
      type: 'string',
      description: 'Problem context'
    },
    decision: {
      type: 'string',
      description: 'Decision made'
    },
    consequences: {
      type: 'string',
      description: 'Consequences of the decision'
    },
    author: {
      type: 'string',
      description: 'Decision author'
    },
    supersedes: {
      type: 'string',
      pattern: '^DECISION-',
      description: 'ID of decision this supersedes'
    },
    supersededBy: {
      type: 'string',
      pattern: '^DECISION-',
      description: 'ID of decision that supersedes this'
    },
    createdAt: {
      type: 'string',
      format: 'date-time'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time'
    }
  }
};
