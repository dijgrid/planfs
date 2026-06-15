# Contributing to PlanFS

Thank you for your interest in contributing to PlanFS! We welcome contributions from community members.

## Code of Conduct

Be respectful, inclusive, and professional. Harassment, discrimination, and toxic behavior are not tolerated.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Follow [Getting Started](./GETTING_STARTED.md) for development setup
4. Create a feature branch: `git checkout -b feature/your-feature`
5. Make your changes
6. Run tests: `npm test --workspaces`
7. Format code: `npm run format`
8. Commit: `git commit -m "feat: Your feature description"`
9. Push: `git push origin feature/your-feature`
10. Open a pull request

## Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow ESLint rules (automatically checked)
- Format with Prettier (use `npm run format`)
- Comment non-obvious logic

### Testing

- Write tests for all new features
- Keep coverage meaningful for the behavior being changed
- Test edge cases and error conditions
- Use descriptive test names

Example test:

```typescript
describe('Task Validation', () => {
  it('should require task ID', () => {
    const task = { title: 'Test' }
    const errors = validateTask(task)
    expect(errors).toContain('id is required')
  })
})
```

### Commits

Use conventional commit format:

```
type(scope): subject

type is one of:
  - feat: new feature
  - fix: bug fix
  - docs: documentation
  - style: formatting/whitespace
  - refactor: code reorganization
  - perf: performance improvements
  - test: test changes
  - chore: build/dependency changes

scope: component affected (optional)
subject: brief description (lowercase, no period)

Example:
feat(core): add circular dependency detection
fix(vscode): resolve explorer tree refresh issue
docs: update architecture diagram
```

### Pull Requests

- Describe what changed and why
- Reference related issues
- Include screenshots for UI changes
- Run all tests before requesting review
- Keep PRs focused on single feature/fix

Template:

```markdown
## Description

Brief description of changes.

## Related Issues

Closes #123

## Changes

- Change 1
- Change 2

## Testing

How to test these changes:
1. Step 1
2. Step 2

## Screenshots

If applicable, attach screenshots of UI changes.
```

## Project Structure

```
src/
├── core/                 # Shared library
│   ├── parsing/          # YAML/markdown parsing
│   ├── validation/       # Schema validation
│   ├── entities/         # Domain models
│   └── graph/            # Dependency graph
├── vscode/               # VS Code extension
│   ├── explorer/         # Tree view UI
│   ├── webview/          # Kanban board UI
│   ├── commands/         # Extension commands
│   └── extension.ts      # Main entry point
├── cli/                  # Command-line tool
│   ├── commands/         # CLI commands
│   └── cli.ts            # Main entry point
└── schema/               # Entity schemas
    ├── task.json
    ├── epic.json
    ├── milestone.json
    └── decision.json
```

## Areas to Contribute

### High Priority

- [ ] Complete Phase 1 (MVP) features
- [ ] Fix bugs reported in issues
- [ ] Improve test coverage
- [ ] Enhance documentation

### Medium Priority

- [ ] Performance optimizations
- [ ] UI/UX improvements
- [ ] Additional entity types (Risk, Requirement)
- [ ] Bulk operations

### Nice-to-Have

- [ ] Themes and customization
- [ ] Additional export formats
- [ ] Community examples
- [ ] Localization

## Testing Checklist

Before submitting a PR:

- [ ] `npm run lint` passes
- [ ] `npm test --workspaces` passes
- [ ] `npm run format` applied
- [ ] Manual testing done
- [ ] Documentation updated
- [ ] No console errors or warnings

## Documentation

- Update docs for new features
- Keep README.md current
- Add examples for complex features
- Include inline code comments
- Update [CHANGELOG.md](./CHANGELOG.md)

## Issue Guidelines

### Reporting Bugs

Include:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment info (OS, VS Code version, etc.)

### Feature Requests

Include:
- Clear title and description
- Use case and motivation
- Possible implementation approach
- Examples from other tools if relevant

## Release Process

1. Update version in `package.json`
2. Update [CHANGELOG.md](./CHANGELOG.md)
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. Build and publish to VS Code marketplace
6. Create GitHub release

## Getting Help

- **Documentation:** See `docs/` directory
- **Examples:** Check `examples/` for sample projects
- **Issues:** Review existing issues before opening new ones
- **Discussions:** Ask questions in GitHub discussions
- **Email:** Contact maintainers

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to PlanFS.
