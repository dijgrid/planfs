Choose the stable public contract without exposing a parser-library AST.

## Context

Automation needs source-aware semantic reads.

## Decision

Expose PlanFS-owned types with a versioned JSON representation.

## Consequences

- Parser implementations can change without breaking consumers.
