# MCP Design Best Practices

Guidelines for creating efficient, maintainable MCP (Model Context Protocol) servers.

---

## The Context Overhead Problem

Every MCP tool you expose consumes context tokens in Claude's conversations:

| Tools | Est. Tokens | Impact |
|-------|-------------|--------|
| 5 | ~2,500 | Minimal - ideal |
| 7 | ~3,500 | Low - still optimal |
| 10 | ~4,500 | Moderate - acceptable |
| 15 | ~7,000 | High - consider splitting |
| 20+ | ~9,000+ | Very high - split required |

**This overhead applies to EVERY conversation**, whether or not the tools are used.

---

## Core Principles

### 1. Less is More

**Aim for 5-7 tools** in your core MCP. This provides:
- Low context overhead
- Clear tool selection for Claude
- Easier maintenance
- Faster user onboarding

**Ask yourself**: Does Claude NEED this tool, or would it be nice to have?

### 2. Project-Level First

Install MCPs at the **project level** unless:
- Used across 5+ projects regularly
- Core to your daily workflow
- Worth the always-on context cost

```bash
# Project level (recommended for most MCPs)
# Add to project's .claude/settings.json

# User level (only for essential, frequently-used MCPs)
# Add to ~/.claude/settings.json
```

### 3. Variants for Scale

If you need 15+ tools, split into variants:

| Variant | Tools | Purpose |
|---------|-------|---------|
| `mcp-core` | 5-7 | Essential CRUD operations |
| `mcp-advanced` | 5-8 | Power user features |
| `mcp-admin` | 3-5 | Administrative operations |

Users install only what they need.

---

## Tool Design Guidelines

### Naming

```yaml
# Good: Clear, action-focused, snake_case
- get_customer
- list_orders
- create_invoice
- search_products

# Bad: Vague, inconsistent, unclear
- customer        # What operation?
- getOrders       # camelCase
- do_thing        # Too vague
- fetch_all_data  # Too generic
```

**Pattern**: `{verb}_{noun}` where verb is: get, list, create, update, delete, search

### Descriptions

```yaml
# Good: Concise, action-focused, includes when to use
description: "Get a customer by ID. Use when you need full customer details."

# Bad: Too long, implementation-focused
description: "This function retrieves a customer record from the database
              using the customer_id parameter which must be a valid UUID..."
```

**Guidelines**:
- Under 150 characters (aim for 100)
- Focus on WHAT and WHEN, not HOW
- Include disambiguation from similar tools

### Parameters

```yaml
# Good: Minimal, clear, well-typed
parameters:
  - name: customer_id
    type: string
    required: true
    description: "Unique customer identifier (UUID)"

# Bad: Too many, unclear types
parameters:
  - name: id
    type: string  # What kind of ID?
  - name: options
    type: object  # What options?
  - name: flag1
  - name: flag2
  - name: flag3  # What do these do?
```

**Guidelines**:
- Under 8 parameters per tool (aim for 4)
- Group related params into objects
- Always include descriptions
- Use specific types (not just "string" for everything)

---

## Common Patterns

### CRUD Operations

Standard set for resource management:

```yaml
tools:
  - get_{resource}      # Get by ID
  - list_{resources}    # List with pagination
  - create_{resource}   # Create new
  - update_{resource}   # Update existing
  - delete_{resource}   # Delete by ID
```

**Token estimate**: ~2,500 (5 tools)

### Search + CRUD

Add search for discoverability:

```yaml
tools:
  - get_{resource}
  - list_{resources}
  - search_{resources}  # Search with filters
  - create_{resource}
  - update_{resource}
  - delete_{resource}
```

**Token estimate**: ~3,000 (6 tools)

### Full Featured

For comprehensive APIs:

```yaml
# Core (install always)
- get_{resource}
- list_{resources}
- search_{resources}
- create_{resource}
- update_{resource}
- delete_{resource}

# Advanced (separate MCP)
- batch_get_{resources}
- batch_update_{resources}
- export_{resources}
- import_{resources}

# Admin (separate MCP)
- admin_list_users
- admin_update_settings
```

---

## Anti-Patterns to Avoid

### 1. Kitchen Sink MCP

**Problem**: One MCP with 20+ tools for "everything"

**Solution**: Split by use case or user role

### 2. Overlapping Tools

**Problem**: `get_user`, `fetch_user`, `retrieve_user` all doing the same thing

**Solution**: One tool per operation

### 3. God Parameters

**Problem**: Single tool with 15 parameters for all variations

**Solution**: Separate tools for distinct operations

### 4. Implementation Leakage

**Problem**: Tools that expose internal API structure

```yaml
# Bad: Exposes internal API
- notion_api_v2_blocks_children_list

# Good: User-focused
- list_page_content
```

### 5. No Error Context

**Problem**: Tools that just fail without helpful messages

**Solution**: Define error handling in behavior spec

---

## Installation Scope Decision Tree

```
Start
  │
  ├─ How many projects use this MCP?
  │   │
  │   ├─ 1-2 projects ──────────────────► Project level
  │   │
  │   ├─ 3-5 projects
  │   │   │
  │   │   └─ Is it used daily? ──────────► User level (if yes)
  │   │                                    Project level (if no)
  │   │
  │   └─ 5+ projects ───────────────────► User level
  │
  └─ How many tools?
      │
      ├─ 1-7 tools ─────────────────────► Scope based on usage
      │
      ├─ 8-15 tools
      │   │
      │   └─ Consider splitting first
      │
      └─ 15+ tools ─────────────────────► Must split into variants
```

---

## Context Efficiency Checklist

Before finalizing your MCP design:

- [ ] **Tool count**: Is it 7 or fewer? If not, can tools be combined or removed?
- [ ] **Descriptions**: Are all under 150 characters?
- [ ] **Parameters**: Are all tools under 8 parameters?
- [ ] **Naming**: Do all tools follow `verb_noun` pattern?
- [ ] **Scope**: Is project-level installation appropriate?
- [ ] **Variants**: If 10+ tools, have you considered splitting?
- [ ] **Examples**: Does each tool have at least one example?
- [ ] **Errors**: Is error handling defined for each tool?

---

## Real-World Examples

### Good: Perceptor MCP

```yaml
tools:
  - perceptor_list     # List available contexts
  - perceptor_load     # Load context by ID
  - perceptor_save     # Save new context
  - perceptor_search   # Search contexts
  - perceptor_sync     # Sync with GitHub
```

**5 tools, ~2,500 tokens** - Focused, efficient, does one thing well.

### Concerning: Large Integration MCP

```yaml
tools:
  # 20+ tools covering every API endpoint
  - list_customers, get_customer, create_customer...
  - list_orders, get_order, create_order...
  - list_products, get_product, create_product...
  # ... and so on
```

**20 tools, ~9,000 tokens** - Should be split into:
- `service-customers-mcp` (5 tools)
- `service-orders-mcp` (5 tools)
- `service-products-mcp` (5 tools)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2024 | Initial best practices |

---

*Built by GRIMLOCK - Autonomous MCP Server Factory*
