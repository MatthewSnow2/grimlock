# GRIMLOCK Production Delivery Workflow

## Overview

This document defines how GRIMLOCK delivers completed MCP servers to customers in production. The workflow ensures clean handoffs while maintaining security and avoiding permanent custody of client code.

---

## Delivery Models

### Model A: Customer-Owned Repository (Recommended)

**Flow:** GRIMLOCK builds → pushes to customer's repo → removes local copy

```
Customer creates empty repo
        │
        ▼
Customer grants GRIMLOCK write access (deploy key or collaborator)
        │
        ▼
GRIMLOCK builds MCP server in workspace
        │
        ▼
GRIMLOCK pushes to customer repo (git remote = customer's repo)
        │
        ▼
GRIMLOCK removes local workspace copy
        │
        ▼
Customer revokes GRIMLOCK access (optional but recommended)
```

**Pros:**
- Customer has full ownership from start
- No repo transfers needed
- Clean audit trail (commits show GRIMLOCK as author)
- Customer can add collaborators/CI immediately

**Cons:**
- Requires customer to set up repo first
- Customer must grant temporary access

**Implementation:**
```bash
# Customer provides repo URL in PRD
customer_repo: "https://github.com/customer-org/their-mcp-server.git"

# GRIMLOCK workflow
git remote add origin $customer_repo
git push -u origin main

# Cleanup
rm -rf /workspace/their-mcp-server
```

---

### Model B: Staging Repo + Transfer

**Flow:** Build in GRIMLOCK staging → transfer ownership → archive/delete staging

```
GRIMLOCK creates staging repo (grimlock-factory/project-staging-xyz)
        │
        ▼
GRIMLOCK builds MCP server
        │
        ▼
GRIMLOCK pushes to staging repo
        │
        ▼
GRIMLOCK initiates repo transfer to customer
        │
        ▼
Customer accepts transfer (GitHub email)
        │
        ▼
Repo moves to customer's org/account
        │
        ▼
GRIMLOCK removes local workspace copy
```

**Pros:**
- Customer doesn't need to set up anything in advance
- Transfer is atomic (all history preserved)
- Customer can review before accepting

**Cons:**
- GitHub transfer requires customer action
- 24-hour window to accept transfer
- Redirects expire after 90 days

**Implementation:**
```bash
# Create staging repo
gh repo create grimlock-factory/staging-$PROJECT_NAME --private

# Build and push
git remote add origin https://github.com/grimlock-factory/staging-$PROJECT_NAME.git
git push -u origin main

# Initiate transfer (requires GitHub settings or API)
gh api repos/grimlock-factory/staging-$PROJECT_NAME/transfer \
  -f new_owner="customer-username"

# Cleanup after transfer confirmed
rm -rf /workspace/$PROJECT_NAME
```

---

### Model C: Artifact Delivery (ZIP/Tarball)

**Flow:** Build → package → upload → customer downloads → GRIMLOCK deletes

```
GRIMLOCK builds MCP server
        │
        ▼
GRIMLOCK creates release artifact (zip/tarball)
        │
        ▼
Artifact uploaded to secure location (S3, GH Release, etc.)
        │
        ▼
Customer notified with download link + checksum
        │
        ▼
Customer downloads and initializes their own git repo
        │
        ▼
GRIMLOCK deletes artifact after X days
        │
        ▼
GRIMLOCK removes local workspace copy
```

**Pros:**
- No GitHub access exchange needed
- Works for any customer setup (GitLab, Bitbucket, self-hosted)
- Customer initializes fresh git history

**Cons:**
- Customer loses build commit history
- Manual step for customer to init repo
- Artifact storage management needed

**Implementation:**
```bash
# Create artifact
cd /workspace
tar -czvf $PROJECT_NAME-v1.0.0.tar.gz $PROJECT_NAME/
sha256sum $PROJECT_NAME-v1.0.0.tar.gz > $PROJECT_NAME-v1.0.0.sha256

# Upload (example: GitHub Release on GRIMLOCK artifacts repo)
gh release create $PROJECT_NAME-v1.0.0 \
  $PROJECT_NAME-v1.0.0.tar.gz \
  $PROJECT_NAME-v1.0.0.sha256 \
  --repo grimlock-factory/deliveries \
  --notes "MCP Server for [Customer]"

# Notify customer with download link
# ...

# Cleanup
rm -rf /workspace/$PROJECT_NAME
rm $PROJECT_NAME-v1.0.0.tar.gz
```

---

## Recommended Workflow: Customer-Owned Repository

For most production use cases, **Model A** is recommended because:

1. **Zero custody**: GRIMLOCK never owns the repository
2. **Clean audit**: Customer sees all commits from "GRIMLOCK Bot"
3. **Immediate ownership**: No transfer delay
4. **Simple cleanup**: Just delete local workspace

### PRD Addition

Add to PRD template:

```yaml
delivery:
  method: "customer_repo"  # customer_repo | staging_transfer | artifact

  # For customer_repo method
  customer_repo_url: "https://github.com/customer-org/project-name.git"

  # For staging_transfer method
  customer_github_username: "customer-username"

  # For artifact method
  artifact_retention_days: 30
```

### n8n Workflow: Delivery Orchestrator

```
Sprint Complete (from Milestone Gate)
        │
        ▼
Read delivery config from PRD
        │
        ▼
┌───────┼───────┐
│       │       │
▼       ▼       ▼
Model A Model B Model C
│       │       │
▼       ▼       ▼
Execute delivery method
        │
        ▼
Cleanup local workspace
        │
        ▼
Update GRIMLOCK_STATE.md
        │
        ▼
Notify customer (Slack/Email)
```

---

## Security Considerations

### Credential Handling

- **NEVER commit real credentials** to any repo
- Always use `.env.example` with placeholder values
- Include setup instructions in README for customer to add credentials

### Access Revocation

- If using Model A: Recommend customer revokes GRIMLOCK access after delivery
- If using Model B: Access automatically removed on transfer completion
- If using Model C: No access exchange needed

### Audit Trail

Keep delivery logs in GRIMLOCK_STATE.md:

```yaml
delivery:
  method: "customer_repo"
  target_repo: "https://github.com/customer-org/their-mcp.git"
  delivered_at: "2025-12-26T20:30:00Z"
  commit_sha: "abc123..."
  local_cleanup_completed: true
```

---

## Cleanup Protocol

After successful delivery:

```bash
# 1. Verify delivery success
git ls-remote $CUSTOMER_REPO

# 2. Remove local workspace
rm -rf /workspace/$PROJECT_NAME

# 3. Update state
# (handled by n8n workflow)

# 4. Reset for next sprint
# GRIMLOCK_STATE.md → not_started
```

---

## Testing Your Setup (Current Session)

For this session, you are both GRIMLOCK operator and customer:

- **GRIMLOCK workspace**: `/home/ubuntu/projects/grimlock/philips-hue-mcp/`
- **Customer repo**: `https://github.com/MatthewSnow2/philips-hue-mcp`
- **Delivery method**: Customer-owned repo (you own the repo)

After confirming delivery, cleanup:

```bash
rm -rf /home/ubuntu/projects/grimlock/philips-hue-mcp
```

---

## Summary

| Model | Best For | Access Required | Customer Setup |
|-------|----------|-----------------|----------------|
| A: Customer Repo | Most cases | Temp write access | Create empty repo |
| B: Staging Transfer | New customers | None initially | Accept transfer |
| C: Artifact | Non-GitHub users | None | Download + init |

**Default recommendation: Model A (Customer-Owned Repository)**
