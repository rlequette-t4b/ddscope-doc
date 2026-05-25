# DDScope — CommWise Platform Conventions
*v0.2 — May 2026*

*Applies to any agent or developer working with CommWise app ID 22645.*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.1 | May 2026 | Initial extraction from CLAUDE.md — session lifecycle, editing, block reading, AI proxy, regex trap |
| 0.2 | May 2026 | Release notes language convention moved to CLAUDE.md (Claude Code-specific instruction) |

---

## 1. Session Lifecycle

Every write operation requires an open session. No write call is valid outside of one.

```
commwise_start_session → write calls (pass session_id) → final write: create_revision: true
```

The final write in every session must include:

```json
{
  "create_revision": true,
  "metadata": {
    "release_notes": "...",
    "append_release_notes": true
  }
}
```

---

## 2. Editing Blocks

### Preferred: `commwise_replace_text` (surgical)

Use for all partial modifications to an existing block.

- `find_text` must match the source **exactly** — indentation and surrounding context included.
- Fails silently when `find_text` exceeds ~5000 characters → fall back to `commwise_update_block`.

### Fallback: `commwise_update_block` (full rewrite)

Full code replacement only — no partial find/replace. Use when the target diff is too large for `commwise_replace_text` or when the block needs a structural rewrite.

### Reading blocks

```
commwise_get_block  with  code_type: 'script'  +  position: <integer>
```

### Inserting blocks

`commwise_insert_block` uses a `block` dict with keys: `title`, `comment`, `code`.
Run `commwise_list_blocks` with `section_filter` before inserting to detect position conflicts.

---

## 3. AI Proxy

Direct Anthropic API calls are CORS-blocked from CommWise. Always use the CommWise secure request proxy:

```javascript
commwiseConfigClient.secureRequest('C3', 'CLAUDE', {
  method: 'POST',
  endpointSuffix: 'v1/messages',
  headers: {
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  body: { ... }
})
```

---

## 4. Known Traps

### regex + `\n` in `commwise_replace_text`

CommWise interprets `\n` in `replace_text` payloads as real newlines. JS regex literals containing `\n` are corrupted on write.

**Fix:** decompose the regex or build via `new RegExp()` with `'\\n'` as a string. Never pass a literal `\n` inside a regex pattern through `replace_text`.

---

*b2wise — Confidential*
