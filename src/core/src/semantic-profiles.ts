import { EntityType } from './types';
import { SemanticContentProfile, SemanticSectionDefinition } from './semantic-types';

function section(
  key: string,
  canonicalHeading: string,
  aliases: readonly string[],
  expectedContent: SemanticSectionDefinition['expectedContent']
): SemanticSectionDefinition {
  return { key, canonicalHeading, aliases, cardinality: '0..1', expectedContent };
}

export const semanticContentProfiles: Readonly<Record<EntityType, SemanticContentProfile>> = {
  task: {
    entityType: 'task',
    version: '1.0.0',
    sections: [
      section('scope', 'Scope', ['In Scope'], 'prose-or-list'),
      section('acceptanceCriteria', 'Acceptance Criteria', ['Acceptance', 'Success Criteria'], 'task-list'),
      section('nonGoals', 'Non-Goals', ['Out of Scope'], 'prose-or-list'),
      section('implementationNotes', 'Implementation Notes', ['Technical Notes'], 'mixed'),
      section('testingStrategy', 'Testing Strategy', ['Test Plan'], 'prose-or-list'),
      section('findings', 'Findings', [], 'prose-or-list'),
      section('decisions', 'Decisions', ['Decision Log'], 'prose-or-list'),
      section('references', 'References', ['Links'], 'list-or-references'),
      section('questions', 'Questions', ['Open Questions'], 'prose-or-list')
    ]
  },
  epic: {
    entityType: 'epic',
    version: '1.0.0',
    sections: [
      section('outcomes', 'Outcomes', ['Goals'], 'prose-or-list'),
      section('scope', 'Scope', ['In Scope'], 'prose-or-list'),
      section('nonGoals', 'Non-Goals', ['Out of Scope'], 'prose-or-list'),
      section('childTasks', 'Child Tasks', ['Tasks'], 'list-or-references'),
      section('findings', 'Findings', [], 'prose-or-list'),
      section('decisions', 'Decisions', ['Decision Log'], 'prose-or-list'),
      section('references', 'References', ['Links'], 'list-or-references'),
      section('questions', 'Questions', ['Open Questions'], 'prose-or-list')
    ]
  },
  milestone: {
    entityType: 'milestone',
    version: '1.0.0',
    sections: [
      section('outcomes', 'Outcomes', ['Goals'], 'prose-or-list'),
      section('scope', 'Scope', ['In Scope'], 'prose-or-list'),
      section('releaseCriteria', 'Release Criteria', ['Exit Criteria', 'Success Criteria'], 'task-list'),
      section('childEpics', 'Child Epics', ['Epics'], 'list-or-references'),
      section('risks', 'Risks', ['Known Risks'], 'prose-or-list'),
      section('findings', 'Findings', [], 'prose-or-list'),
      section('decisions', 'Decisions', ['Decision Log'], 'prose-or-list'),
      section('references', 'References', ['Links'], 'list-or-references'),
      section('questions', 'Questions', ['Open Questions'], 'prose-or-list')
    ]
  },
  decision: {
    entityType: 'decision',
    version: '1.0.0',
    sections: [
      section('context', 'Context', ['Background'], 'prose'),
      section('decision', 'Decision', ['Resolution'], 'prose'),
      section('consequences', 'Consequences', ['Implications'], 'prose-or-list'),
      section('alternatives', 'Alternatives', ['Options Considered'], 'prose-or-list'),
      section('findings', 'Findings', [], 'prose-or-list'),
      section('references', 'References', ['Links'], 'list-or-references'),
      section('questions', 'Questions', ['Open Questions'], 'prose-or-list')
    ]
  }
};

export function getSemanticContentProfile(entityType: EntityType): SemanticContentProfile {
  return semanticContentProfiles[entityType];
}
