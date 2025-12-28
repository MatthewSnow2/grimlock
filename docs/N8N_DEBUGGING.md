# n8n Workflow Debugging

GRIMLOCK includes an n8n debugging skill for troubleshooting workflow issues.

## Usage

Debug n8n workflows using the `n8n debug` skill:

```
n8n debug {workflow-id}
```

## Features

- Fetches workflow structure and recent executions
- Analyzes error patterns and root causes
- Suggests specific fixes with code examples
- Can apply fixes via `n8n_update_partial_workflow`

## Skill Location

See `~/.claude/skills/n8n-debugger/` for patterns and examples.

## Integration with GRIMLOCK

While GRIMLOCK's primary purpose is building MCP servers, the n8n debugging skill helps maintain the orchestration workflows that power the autonomous build system.

## Related Tools

- `n8n_get_workflow` - Retrieve workflow structure
- `n8n_executions` - List and analyze executions
- `n8n_validate_workflow` - Validate workflow configuration
- `n8n_update_partial_workflow` - Apply incremental fixes
