# DDScope — AI Assistant (Claude)
## Request for Comments — v0.9 — Draft — May 2026

---

## Version History

| Version | Date     | Summary                  |
|---------|----------|--------------------------|
| 0.1     | May 2026 | Initial RFC               |
| 0.2     | May 2026 | Project description in context JSON; concept glossary in system prompt |
| 0.3     | May 2026 | Section 5.1 — static injection approach documented; ACTION_VOCABULARY as JS constant |
| 0.4     | May 2026 | Type management excluded from action vocabulary; new_* ID convention clarified; prompt and action vocabulary consolidated into RFC (sections 5.1 and 5.3) |
| 0.5     | May 2026 | Last-turn context for correction support; answer field (Option C) for analytical questions |
| 0.6     | May 2026 | RFC template updated to three-field contract (reasoning, answer, actions); interaction table added |
| 0.7     | May 2026 | Context format updated for multi-map model; active_map added; map actions excluded from v1 vocabulary |
| 0.8     | May 2026 | stock_points renamed to skus; tags added on flows and skus; swim-lane position removed; plan validation resolved as all-or-nothing |
| 0.9     | May 2026 | DataStore references replaced by neutral wording |

---

## 1. Purpose

This document specifies the contract between DDScope and an embedded Claude assistant capable of modifying a project in natural language. It covers the action vocabulary, the project context format transmitted to Claude, the system prompt contract, and the validation mechanism before any change is applied to the project.

This document does not cover UI layout or implementation details. It is intended to align the team on the interface contract before any development begins.

---

## 2. Guiding Principles

- **Bounded agency.** Claude can only emit actions from a predefined, versioned list. It cannot invent operations or reference entities outside the transmitted context.
- **Human confirmation required.** No action is applied without explicit user validation of the proposed plan. Validation is all-or-nothing — the plan is applied in full or not at all.
- **Transparency of reasoning.** Every response from Claude includes a `reasoning` field explaining what was understood, which entities were identified, and why the proposed actions were chosen.
- **Graceful ambiguity handling.** If the instruction is ambiguous or no matching entities are found, Claude returns an empty action list and explains why in `reasoning`. It does not guess.
- **Stateless per request.** Claude has no memory between messages. The full project context is transmitted with every request.

---

## 3. Action Vocabulary

The following actions constitute the complete contract. Claude may only use actions from this list. Any response containing an unknown action type is rejected by DDScope before execution.

### 3.1 Nodes

| Action | Required fields | Optional fields |
|---|---|---|
| `add_node` | `name` | `type_code`, `swim_lane_id`, `tags`, `notes` |
| `update_node` | `node_id` | `name`, `type_code`, `swim_lane_id`, `tags`, `notes` |
| `delete_node` | `node_id` | — |
| `assign_node_to_lane` | `node_id`, `swim_lane_id` | — |

> `delete_node` implicitly removes all flows where the node is source or target, and all SKUs for that node. This cascade must be stated explicitly in the `reasoning` field when applicable.

> Note: `add_node` does not accept `x, y` fields. Canvas position is map-specific and is not set by the AI assistant in v1.

### 3.2 Flows

| Action | Required fields | Optional fields |
|---|---|---|
| `add_flow` | `source_id`, `target_id` | `lead_time_value`, `lead_time_unit`, `tags`, `notes` |
| `update_flow` | `flow_id` | `lead_time_value`, `lead_time_unit`, `tags`, `notes` |
| `delete_flow` | `flow_id` | — |
| `reroute_flow` | `flow_id` | `new_source_id`, `new_target_id` (at least one required) |
| `add_product_to_flow` | `flow_id`, `product_id` | — |
| `remove_product_from_flow` | `flow_id`, `product_id` | — |

### 3.3 Products

| Action | Required fields | Optional fields |
|---|---|---|
| `add_product` | `name` | `type_code`, `tags`, `notes` |
| `update_product` | `product_id` | `name`, `type_code`, `tags`, `notes` |
| `delete_product` | `product_id` | — |

> `delete_product` implicitly removes the product from all flows and all SKUs. This cascade must be stated in `reasoning`.

### 3.4 SKUs

A SKU is the association between a node and a product. Tags express the nature of the association (e.g. `buffer`, `stock`, `transit`).

| Action | Required fields | Optional fields |
|---|---|---|
| `add_sku` | `node_id`, `product_id` | `tags`, `notes` |
| `update_sku` | `node_id`, `product_id` | `tags`, `notes` |
| `remove_sku` | `node_id`, `product_id` | — |

### 3.5 Swim-lanes

| Action | Required fields | Optional fields |
|---|---|---|
| `add_swim_lane` | `name` | `color` |
| `update_swim_lane` | `swim_lane_id` | `name`, `color` |

> Swim-lane deletion is excluded from v1 of the AI assistant to avoid unintended cascade on node assignments.

### 3.6 Map actions — excluded from v1

Map management (creating, renaming, duplicating, deleting maps) and map-scoped operations (adding or removing elements from a map, updating canvas positions) are excluded from the AI assistant action vocabulary in v1. These operations are performed manually via the map UI.

The AI assistant operates on the **functional layer** only: nodes, flows, products, SKUs, and swim-lane definitions. It has no write access to `maps`, `map_nodes`, `map_flows`, or `map_swim_lanes`.

### 3.7 Type management — excluded from v1

Node types and product types are configuration-level entities managed in the Settings tab. They are intentionally excluded from the AI assistant action vocabulary for v1, for two reasons:

- A type error (wrong shape, wrong code) affects the visual rendering of all nodes using that type, not just the one being created.
- Type deletion can silently break existing nodes or products that reference it.

**Fallback behaviour:** if no existing `type_code` matches the intended entity type, Claude selects the closest available type from the project context and explains the choice in `reasoning`. The consultant is responsible for creating new types manually before invoking the assistant if needed.

---

## 4. Project Context Format

The following JSON structure is serialised from the current project state and transmitted to Claude with every request. IDs are DataStore record IDs serialised as strings. Canvas geometry (x, y, width, height) is omitted — it is map-specific and not relevant to functional reasoning.

The `active_map` field identifies the map currently open in the UI. It is included for informational purposes — Claude does not write to map-scoped tables in v1, but may reference the active map when answering analytical questions (e.g. "which nodes are visible on this map").

```json
{
  "project": {
    "id": "string",
    "name": "string",
    "description": "string"
  },

  // description is a short free-text field set at project creation.
  // It typically summarises the client context, the scope boundaries,
  // or the purpose of the mapping exercise. Include it even if empty.

  "active_map": {
    "id": "string",
    "name": "string",
    "node_ids": ["string"],
    "flow_ids": ["string"],
    "swim_lane_ids": ["string"]
  },

  // active_map reflects the map currently open in the UI.
  // node_ids, flow_ids, and swim_lane_ids list the elements currently
  // visible on this map. Claude may use this to answer questions about
  // what is shown, but does not modify map visibility in v1.

  "maps": [
    {
      "id": "string",
      "name": "string",
      "position": "integer"
    }
  ],

  "swim_lanes": [
    {
      "id": "string",
      "name": "string"
    }
  ],
  "node_types": [
    {
      "code": "string",
      "label": "string"
    }
  ],
  "product_types": [
    {
      "code": "string",
      "label": "string"
    }
  ],
  "nodes": [
    {
      "id": "string",
      "name": "string",
      "type_code": "string",
      "swim_lane_id": "string | null",
      "tags": ["string"],
      "notes": "string"
    }
  ],
  "products": [
    {
      "id": "string",
      "name": "string",
      "type_code": "string",
      "tags": ["string"],
      "notes": "string"
    }
  ],
  "flows": [
    {
      "id": "string",
      "source_id": "string",
      "target_id": "string",
      "product_ids": ["string"],
      "tags": ["string"],
      "lead_time_value": "number | null",
      "lead_time_unit": "string | null",
      "notes": "string"
    }
  ],
  "skus": [
    {
      "node_id": "string",
      "product_id": "string",
      "tags": ["string"],
      "notes": "string"
    }
  ]
}
```

---

## 5. System Prompt and Claude Contract

### 5.1 System prompt (reference version)

The system prompt is a **template string defined in the DDScope application**. It contains a single placeholder `{{ACTION_VOCABULARY}}` where the action list is injected at call time.

The action vocabulary is a **separate constant** in the same application, formatted as a structured text block. Both evolve together and are versioned with the application. No external storage or admin interface is required.

Assembly at call time:

```javascript
const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace(
  '{{ACTION_VOCABULARY}}',
  ACTION_VOCABULARY_TEXT
);
```

### Last-turn context (multi-turn within a session)

To support correction instructions (*"actually make it 20 days"*, *"also add product X to that flow"*), the previous turn is injected into the messages array before the current instruction. Only the immediately preceding turn is transmitted — not the full history — to limit token cost.

```javascript
// If a previous turn exists in DDS_AI.history:
messages = [
  { role: 'user',      content: 'Previous instruction: ' + lastEntry.instruction },
  { role: 'assistant', content: JSON.stringify({ reasoning: lastEntry.reasoning, actions: lastEntry.actions }) },
  { role: 'user',      content: 'Project context:\n' + JSON.stringify(context) + '\n\nInstruction: ' + instruction }
];

// First turn (no history):
messages = [
  { role: 'user', content: 'Project context:\n' + JSON.stringify(context) + '\n\nInstruction: ' + instruction }
];
```

The project context JSON is always included fresh in the current user message — it reflects the actual DataStore state after any previous Apply, so Claude sees new entities created in prior turns.

**Template (with placeholder):**

```
You are an assistant embedded in DDScope, a supply chain mapping tool used during DDMRP implementation scoping workshops.

Concepts used in this tool:
- Node: any supply chain actor (supplier, plant, warehouse, customer). Nodes are positioned on a map.
- Flow: a directed link between two nodes representing material movement. A flow can carry tags (e.g. transport mode) and may have no associated products.
- Product: a material or item that flows between nodes.
- SKU: the association between a node and a product. It represents the fact that this node handles this product in the scope of the project. The nature of the association (physical stock, buffer point, transit, etc.) is expressed through tags on the SKU.
- Swim-lane: a named region grouping nodes by supply chain stage (e.g. Sourcing, Production, Distribution). A swim-lane's assignment to a node is shared across all maps; its visual position on the canvas is map-specific.
- Map: a named view of the project. Each map shows a subset of the project's nodes, flows, and swim-lanes. The same node or flow can appear on multiple maps. The active_map field in the context identifies which map is currently open.
- Tags: free-text labels attached to nodes, products, flows, or SKUs, used for grouping and filtering (e.g. "export", "pilot", "road", "buffer").

You receive two inputs:
1. A JSON snapshot of the current project (entities, IDs, tags, relationships, active map).
2. A user instruction in natural language.

You must respond with a single JSON object — no prose, no markdown, no explanation outside the JSON structure — containing exactly three fields:

{
  "reasoning": "string",
  "answer": "string or null",
  "actions": []
}

"reasoning": Explain in 2–5 sentences what you understood from the instruction, which entities you identified, and why you chose the proposed actions or answer.

"answer": If the instruction is a question about the project (e.g. cumulative lead time, list of nodes, which products have no SKU, which nodes are on the active map), provide a clear natural language answer here. Set to null if the instruction is a modification request.

"actions": An ordered array of action objects if the instruction is a modification request. Set to [] if the instruction is a question. Each action must have a "type" field matching exactly one of the allowed action types listed below. All referenced IDs must exist in the provided project context. Never invent IDs.

| Scenario | answer | actions |
|---|---|---|
| Modification request | null | non-empty array |
| Analytical question | non-null string | [] |
| Ambiguous instruction | null | [] (clarification in reasoning) |

Allowed action types and their fields:
{{ACTION_VOCABULARY}}

Rules:
- Only use IDs present in the project context.
- If an instruction implies creating a new entity (e.g. a new node, a new product), generate a temporary placeholder ID prefixed with "new_" (e.g. "new_node_1", "new_product_2"). Include this "id" field directly in the add_* action itself, so that subsequent actions in the same plan can reference it. DDScope will resolve these to real DataStore IDs at execution time, substituting each "new_*" reference before the next action runs.
- If the instruction would cause a cascade deletion (node with flows, product on flows), list all implied actions explicitly in the actions array and mention the cascade in reasoning.
- If no existing type_code matches the intended node or product type, use the closest available type from the project context and explain the choice in reasoning. Do not create new types — type management remains manual via the Settings tab.
- Do not emit actions on maps or map-scoped entities (map_nodes, map_flows, map_swim_lanes). Map visibility is managed manually by the consultant via the UI.
- If the instruction is ambiguous, return actions: [] and ask for clarification in reasoning.
- Never return free text outside the JSON object.
```

### 5.2 New entity ID convention

When an action creates a new entity that is referenced by a subsequent action in the same plan (e.g. `add_node` followed by `add_flow` targeting that node), Claude uses a temporary `new_*` ID. The `"id"` field must be included directly in the `add_*` action itself. DDScope resolves these references sequentially during execution: the real DataStore ID returned by step N is substituted into all subsequent steps referencing that `new_*` ID before they are executed.

Example:

```json
{
  "reasoning": "Creating a new warehouse node and connecting existing flows to it.",
  "answer": null,
  "actions": [
    {
      "type": "add_node",
      "id": "new_node_1",
      "name": "Export Warehouse",
      "type_code": "WAREHOUSE",
      "swim_lane_id": "sl_3"
    },
    {
      "type": "reroute_flow",
      "flow_id": "f_12",
      "new_target_id": "new_node_1"
    },
    {
      "type": "add_sku",
      "node_id": "new_node_1",
      "product_id": "p_4",
      "tags": ["stock"]
    }
  ]
}
```

### 5.3 Action vocabulary text (injected at `{{ACTION_VOCABULARY}}`)

This is the exact content of `ACTION_VOCABULARY_TEXT` injected into the system prompt at call time. It must stay in sync with section 3.

```
--- NODES ---

add_node
  Required : name
  Optional : type_code, swim_lane_id, tags, notes
  Note     : x, y are NOT accepted — canvas position is map-specific and set manually.
  Note     : include "id": "new_node_N" in this action when referenced
             by subsequent actions in the same plan.

update_node
  Required : node_id
  Optional : name, type_code, swim_lane_id, tags, notes

delete_node
  Required : node_id
  Note     : implicitly removes all flows where this node is source or target,
             and all SKUs for this node.
             List all implied cascade actions explicitly in the actions array.

assign_node_to_lane
  Required : node_id, swim_lane_id


--- FLOWS ---

add_flow
  Required : source_id, target_id
  Optional : lead_time_value, lead_time_unit, tags, notes
  Note     : a flow with no products is valid.

update_flow
  Required : flow_id
  Optional : lead_time_value, lead_time_unit, tags, notes

delete_flow
  Required : flow_id

reroute_flow
  Required : flow_id + at least one of new_source_id or new_target_id
  Optional : new_source_id, new_target_id

add_product_to_flow
  Required : flow_id, product_id

remove_product_from_flow
  Required : flow_id, product_id


--- PRODUCTS ---

add_product
  Required : name
  Optional : type_code, tags, notes
  Note     : include "id": "new_product_N" in this action when referenced
             by subsequent actions in the same plan.

update_product
  Required : product_id
  Optional : name, type_code, tags, notes

delete_product
  Required : product_id
  Note     : implicitly removes the product from all flows and all SKUs.
             List all implied cascade actions explicitly in the actions array.


--- SKUs ---

add_sku
  Required : node_id, product_id
  Optional : tags, notes
  Note     : tags express the nature of the association (e.g. "buffer", "stock", "transit").

update_sku
  Required : node_id, product_id
  Optional : tags, notes

remove_sku
  Required : node_id, product_id


--- SWIM-LANES ---

add_swim_lane
  Required : name
  Optional : color
  Note     : include "id": "new_lane_N" in this action when referenced
             by subsequent actions in the same plan.

update_swim_lane
  Required : swim_lane_id
  Optional : name, color

Note: swim_lane deletion is excluded from v1 of the AI assistant.
Note: node_type and product_type creation are excluded from v1. Use the closest
      existing type_code and explain the choice in reasoning.
Note: map management and map visibility (map_nodes, map_flows, map_swim_lanes)
      are excluded from v1. Do not emit actions on these entities.
```

---

## 6. Validation and Execution Mechanism

### 6.1 Principle

No action is applied without explicit user confirmation. The flow is:

```
User instruction
      ↓
DDScope serialises context + calls Claude API
      ↓
Claude returns { reasoning, answer, actions }
      ↓
DDScope displays the plan (reasoning + action list)
      ↓
User confirms → DDScope executes actions sequentially
User cancels  → nothing is applied
```

### 6.2 Plan display

The confirmation panel shows:

- The `reasoning` text in full.
- The `answer` text if present (for analytical questions — no actions to confirm).
- A numbered list of actions, each rendered as a human-readable sentence (not raw JSON). Example:
  - *Create node "Export Warehouse" (type: Warehouse, swim-lane: Distribution)*
  - *Reroute flow f_12 → new target: Export Warehouse*
  - *Add SKU: Export Warehouse × Product Fini A (tags: stock)*
- An action count summary: *"3 actions to apply"*
- Two buttons: **Apply** and **Cancel**

### 6.3 Execution

Actions are executed sequentially in the order returned by Claude. After each write, DDScope resolves `new_*` references for subsequent actions. If any action fails (integrity violation, unexpected error), execution halts and the user is informed of which action failed and which actions were already applied.

### 6.4 Partial failure

In v1, there is no automatic rollback. Validation is all-or-nothing from the user's perspective — Apply executes the full plan, Cancel executes nothing. If execution halts mid-plan due to an error, the user is shown the list of applied and unapplied actions and can take manual corrective action. Full rollback (undo) is deferred to a future version; the recommended mitigation before any AI session is to duplicate the project (Save As).

---

## 7. Open Questions

| # | Question | Impact |
|---|---|---|
| 1 | Should the action list be embedded in the system prompt or injected dynamically per request? Dynamic injection allows versioning the vocabulary without changing the prompt. | System prompt design |
| 2 | What is the maximum acceptable context size? Large projects (50+ nodes, 100+ flows) may approach token limits. A context trimming strategy (e.g. omitting notes fields) may be needed. | Scalability |
| 3 | Should the user be able to edit the action plan before confirming? | **Resolved in v0.8:** validation is all-or-nothing. The confirmation panel is read-only. Apply executes the full plan; Cancel executes nothing. |
| 4 | Should conversation history be maintained within a session (multi-turn)? | **Resolved in v0.5:** last turn only is transmitted (previous instruction + reasoning + actions). This allows correction instructions ("actually make it 20 days", "also add product X to that flow") without the token cost of full history. Full history remains out of scope. |
| 5 | Swim-lane deletion: under what conditions should it be allowed via the assistant? | Action vocabulary v2 |
| 6 | Should the AI assistant gain write access to map-scoped entities in v2 (e.g. "add this node to the active map")? | Action vocabulary v2 |

---

*b2wise — Confidential*
