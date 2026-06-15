---
id: EPIC-mvp-core
title: MVP - Core Functionality
status: completed
owner: justin
description: Establish core parsing, validation, and basic UI for project management
targetDate: 2026-07-14
createdAt: 2026-06-14T10:00:00Z
updatedAt: 2026-06-14T10:00:00Z
---

Build the minimum viable product with core functionality: file parsing, schema validation, and basic VS Code integration.

## Overview

The MVP focuses on getting the core engine working and providing a functional first experience:
- Load and parse .planfs files
- Validate repository integrity
- Show entities in VS Code explorer
- Create new entities through UI and CLI

## Child Tasks

- TASK-001: Initialize project repository
- TASK-002: Build core parser and repository API
- TASK-003: Implement repository validation pipeline
- TASK-004: Define schema package
- TASK-005: Build VS Code explorer basics
- TASK-006: Implement task creation workflows
- TASK-007: Build CLI query commands
- TASK-008: Add CLI task creation
- TASK-009: Add Phase 1 test coverage
- TASK-010: Publish MVP documentation and examples

## Success Criteria

A developer can:
1. Install the VS Code extension
2. See all tasks, epics, milestones in explorer
3. Create new tasks via UI or CLI
4. Run validation checks
5. Commit to Git and track changes
