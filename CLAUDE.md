# GRIMLOCK MCP Factory

An AI-powered factory that generates MCP servers from PRD specifications.

## Current State

Check `GRIMLOCK_STATE.md` for current build status.

## Project Structure

```
grimlock/
├── GRIMLOCK_STATE.md    # Build status (single source of truth)
├── prds/                # Input: PRD specification files
├── mcps/                # Output: Built MCP server packages
└── docs/                # Documentation
```

## Build Process

When triggered with a PRD file:
1. Read PRD from `prds/{prd_file}`
2. Create project in `mcps/{project_name}/`
3. Implement MCP server according to PRD specs
4. Run tests
5. Package and upload to Google Drive

## Build Completion Protocol

When an MCP build is successfully completed (all tests pass, documentation generated):

### 1. Package the MCP
```bash
cd /home/ubuntu/projects/grimlock/mcps
zip -r {mcp-name}.zip {mcp-name}/
```

### 2. Upload to Google Drive via n8n webhook
```bash
curl -X POST https://im4tlai.app.n8n.cloud/webhook/grimlock/upload-mcp \
  -H "Content-Type: application/json" \
  -d '{
    "buildId": "{current-build-id}",
    "mcpName": "{mcp-name}"
  }'
```

### 3. Update GRIMLOCK_STATE.md
Set the following values:
- `status: complete`
- `phase: complete`
- `progress: 100`
- The webhook will update `mcp_download_url` automatically

## State File Format

GRIMLOCK_STATE.md uses YAML frontmatter:

```yaml
---
build_id: mcp-example-1704067200000
prd_file: mcp-example-PRD.yaml
status: running          # idle | running | complete | failed
phase: implementation    # prd_uploaded | implementation | testing | documentation | packaging | complete
progress: 45             # 0-100
mcp_download_url: null   # Populated when complete
started_at: 2024-12-31T10:00:00Z
updated_at: 2024-12-31T10:15:00Z
---
```

## Phase Definitions

| Phase | Progress Range | Description |
|-------|----------------|-------------|
| prd_uploaded | 0-10% | PRD received, analyzing requirements |
| implementation | 10-60% | Building MCP server code |
| testing | 60-80% | Running tests, fixing issues |
| documentation | 80-90% | Generating README, examples |
| packaging | 90-99% | Zipping, uploading to Google Drive |
| complete | 100% | Build finished successfully |

## Error Handling

If build fails:
1. Set `status: failed` in GRIMLOCK_STATE.md
2. Add error details to state file
3. Do NOT call the upload webhook

## Conventions

- Use MCP SDK latest stable version
- Follow PRD tool specifications exactly
- Create comprehensive tests
- Include .env.example for required credentials
- Write clear README with setup instructions
