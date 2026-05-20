# DDScope — AI Assistant (Claude)
## Request for Comments — v1.3 — Draft — May 2026

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
| 1.0     | May 2026 | BOM actions added (section 3.6); project-specific instructions added (section 5.4); context format updated with boms and bom_components |
| 1.1     | May 2026 | node_types context enriched with is_product_node_default, is_default, default_swim_lane_id; product_types with is_default; product-node pattern documented in action vocabulary (section 5.3) |
| 1.2     | May 2026 | Product-node pattern rewritten as default behaviour; add_product_to_flow restricted to explicit exception (existing flow between two existing non-product nodes); cascade listing made explicit for delete_node and delete_product; add_sku tag note added |
| 1.3     | May 2026 | Demand actions added (section 3.9); context format updated with demands |

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

> `delete_node` implicitly removes all flows where the node is source or target, all SKUs for that node, and all demands for that node. This cascade must be stated in `reasoning` and listed explicitly in the `actions` array.

> Note: `add_node` does not accept `x, y` fields. Canvas position is map-specific and is not set by the AI assistant in v1.

#### Product-node pattern

**Default behaviour:** whenever a new product is mentioned, apply the product-node pattern:

1. Emit `add_product` if the product does not exist.
2. Emit `add_node` with `name` = product name, `type_code` = the type marked `is_product_node_default` in `node_types` (fall back to `is_default`, then first type), `swim_lane_id` = `default_swim_lane_id` of that type unless the user specifies another lane.
3. Emit `add_sku` for the node × product pair.
4. Emit `add_flow` if the product is described as a source or destination of a flow.

**Exception — `add_product_to_flow` only:** when the user explicitly asks to add a product to an existing flow between two existing non-product nodes (i.e. both endpoints already exist and neither represents a product), use `add_product_to_flow` instead. Do NOT create a node for the product in this case.

In all other cases — new product, product as a flow endpoint, product placed in a lane — apply the product-node pattern.

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

> `delete_product` implicitly removes the product from all flows, all SKUs, and all demands associated with those SKUs. This cascade must be stated in `reasoning` and listed explicitly in the `actions` array.

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

### 3.6 BOMs

A BOM describes a transformation performed by a node: one output product manufactured from one or more input components with quantities. A node can have multiple BOMs (one per output product).

| Action | Required fields | Optional fields |
|---|---|---|
| `add_bom` | `node_id`, `output_product_id` | `notes` |
| `update_bom` | `bom_id` | `output_product_id`, `notes` |
| `delete_bom` | `bom_id` | — |
| `add_bom_component` | `bom_id`, `product_id`, `quantity` | `notes` |
| `update_bom_component` | `bom_id`, `product_id` | `quantity`, `notes` |
| `remove_bom_component` | `bom_id`, `product_id` | — |

> `add_bom` accepts `"id": "new_bom_N"` when the BOM is referenced by subsequent `add_bom_component` actions in the same plan.

> `delete_bom` implicitly removes all its `bom_components`. This cascade must be stated in `reasoning`.

> Claude must verify that the output product and all component products exist as SKUs on the node before emitting BOM actions. If a required SKU is absent, Claude should state this in `reasoning` and propose the necessary `add_sku` actions first.

### 3.7 Map actions — excluded from v1

Map management (creating, renaming, duplicating, deleting maps) and map-scoped operations (adding or removing elements from a map, updating canvas positions) are excluded from the AI assistant action vocabulary in v1. These operations are performed manually via the map UI.

The AI assistant operates on the **functional layer** only: nodes, flows, products, SKUs, swim-lane definitions, BOMs, and demands. It has no write access to `maps`, `map_nodes`, `map_flows`, `map_swim_lanes`, or `map_demands`.

### 3.8 Type management — excluded from v1

Node types and product types are configuration-level entities managed in the Settings tab. They are intentionally excluded from the AI assistant action vocabulary for v1.

**Fallback behaviour:** if no existing `type_code` matches the intended entity type, Claude selects the closest available type from the project context and explains the choice in `reasoning`.

### 3.9 Demands

A demand record captures the CTT (Customer Tolerance Time) and average demand per period for a SKU.

**CTT (Customer Tolerance Time):** the maximum time a customer is willing to wait for an order to be fulfilled without losing the sale. Used in DDMRP buffer positioning to determine where decoupling points are needed.

**Demand per period:** the average consumption rate of the product at this node (e.g. 100 units per week).

At most one demand per SKU.

| Action | Required fields | Optional fields |
|---|---|---|
| `add_demand` | `node_id`, `product_id` | `ctt_value`, `ctt_unit`, `demand_value`, `demand_period`, `notes` |
| `update_demand` | `node_id`, `product_id` | `ctt_value`, `ctt_unit`, `demand_value`, `demand_period`, `notes` |
| `delete_demand` | `node_id`, `product_id` | — |

> Unit values for `ctt_unit` and `demand_period`: `hours`, `days`, `weeks`, `months`, `years`.

> `delete_demand` cascades to `map_demands`. This must be stated in `reasoning`.

> Claude must verify that the SKU (node × product pair) exists before emitting `add_demand`. If absent, propose `add_sku` first.

> Map visibility (`map_demands`) is excluded from the AI assistant action vocabulary — opt-in display is a manual operation.

---

## 4. Project Context Format

The following JSON structure is serialised from the current project state and transmitted to Claude with every request. IDs are record IDs serialised as strings. Canvas geometry (x, y, width, height) is omitted.

```json
{
  "project": {
    "id": "string",
    "name": "string",
    "description": "string"
  },

  "active_map": {
    "id": "string",
    "name": "string",
    "node_ids": ["string"],
    "flow_ids": ["string"],
    "swim_lane_ids": ["string"]
  },

  "maps": [
    { "id": "string", "name": "string", "position": "integer" }
  ],

  "swim_lanes": [
    { "id": "string", "name": "string" }
  ],
  "node_types": [
    {
      "code": "string",
      "label": "string",
      "is_default": "boolean",
      "is_product_node_default": "boolean",
      "default_swim_lane_id": "string | null"
    }
  ],
  "product_types": [
    {
      "code": "string",
      "label": "string",
      "is_default": "boolean"
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
  ],
  "boms": [
    {
      "id": "string",
      "node_id": "string",
      "output_product_id": "string",
      "notes": "string"
    }
  ],
  "bom_components": [
    {
      "id": "string",
      "bom_id": "string",
      "product_id": "string",
      "quantity": "number",
      "notes": "string"
    }
  ],
  "demands": [
    {
      "node_id": "string",
      "product_id": "string",
      "ctt_value": "number | null",
      "ctt_unit": "string | null",
      "demand_value": "number | null",
      "demand_period": "string | null",
      "notes": "string"
    }
  ]
}
```

> `node_types` transmits `is_default`, `is_product_node_default`, and `default_swim_lane_id` so Claude can resolve the correct type and swim-lane for the product-node pattern without guessing.

> `product_types` transmits `is_default` so Claude can select the correct default product type when creating a product.

---

## 5. System Prompt and Claude Contract

### 5.1 System prompt (reference version)

The system prompt is a **template string defined in the DDScope application**. It contains a single placeholder `{{ACTION_VOCABULARY}}` where the action list is injected at call time.

Assembly at call time:

```javascript
const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace(
  '{{ACTION_VOCABULARY}}',
  ACTION_VOCABULARY_TEXT
);
```

### 5.2 Last-turn context (multi-turn within a session)

To support correction instructions, the previous turn is injected into the messages array before the current instruction. Only the immediately preceding turn is transmitted.

```javascript
// If a previous turn exists in DDS_AI.history:
messages = [
  { role: 'user',      content: 'Previous instruction: ' + lastEntry.instruction },
  { role: 'assistant', content: JSON.stringify({ reasoning: lastEntry.reasoning, actions: lastEntry.actions }) },
  // Project-specific instructions block (if defined — see §5.4)
  { role: 'user',      content: 'Project-specific instructions:\n' + ai_instructions },
  { role: 'assistant', content: 'Understood.' },
  { role: 'user',      content: 'Project context:\n' + JSON.stringify(context) + '\n\nInstruction: ' + instruction }
];

// First turn (no history):
messages = [
  // Project-specific instructions block (if defined — see §5.4)
  { role: 'user',      content: 'Project-specific instructions:\n' + ai_instructions },
  { role: 'assistant', content: 'Understood.' },
  { role: 'user',      content: 'Project context:\n' + JSON.stringify(context) + '\n\nInstruction: ' + instruction }
];
```

The project-specific instructions block is omitted entirely when `project.ai_instructions` is empty or null.

### 5.3 Action vocabulary text (injected at `{{ACTION_VOCABULARY}}`)

```
--- NODES ---

add_node
  Required : name
  Optional : type_code, swim_lane_id, tags, notes
  Note     : x, y are NOT accepted — canvas position is map-specific and set manually.
  Note     : include "id": "new_node_N" in this action when referenced
             by subsequent actions in the same plan.

  PRODUCT-NODE PATTERN (default behaviour): whenever a new product is mentioned,
  apply the product-node pattern — create a node (name = product name,
  type = is_product_node_default, swim_lane_id = default_swim_lane_id unless
  specified by the user) and emit add_sku for the node x product pair.
  Also emit add_flow if the product is described as a source or destination.

  EXCEPTION — add_product_to_flow only: when the user explicitly asks to add a
  product to an existing flow between two existing non-product nodes (i.e. both
  endpoints already exist and neither represents a product), use
  add_product_to_flow instead. Do NOT create a node for the product in this case.

  In all other cases — new product, product as a flow endpoint, product placed
  in a lane — apply the product-node pattern.

update_node
  Required : node_id
  Optional : name, type_code, swim_lane_id, tags, notes

delete_node
  Required : node_id
  Note     : implicitly removes all flows where this node is source or target,
             all SKUs for this node, and all demands for this node.
             List all implied cascade actions explicitly in the actions array.

assign_node_to_lane
  Required : node_id, swim_lane_id


--- FLOWS ---

add_flow
  Required : source_id, target_id
  Optional : lead_time_value, lead_time_unit, tags, notes
  Note     : a flow with no products is valid.
  Note     : include "id": "new_flow_N" in this action when referenced
             by subsequent actions in the same plan.

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
  Note     : implicitly removes the product from all flows, all SKUs,
             and all demands associated with those SKUs.
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


--- BOMs ---

add_bom
  Required : node_id, output_product_id
  Optional : notes
  Note     : include "id": "new_bom_N" when referenced by subsequent add_bom_component actions.
  Note     : verify that output_product_id exists as a SKU on the node.
             If not, propose add_sku first.

update_bom
  Required : bom_id
  Optional : output_product_id, notes

delete_bom
  Required : bom_id
  Note     : implicitly removes all bom_components for this BOM.
             State the cascade explicitly in reasoning.

add_bom_component
  Required : bom_id, product_id, quantity
  Optional : notes
  Note     : verify that product_id exists as a SKU on the node.
             If not, propose add_sku first.

update_bom_component
  Required : bom_id, product_id
  Optional : quantity, notes

remove_bom_component
  Required : bom_id, product_id


--- DEMANDS ---

A demand record captures two customer-facing metrics for a SKU:
- CTT (Customer Tolerance Time): the maximum time a customer is willing to wait
  for an order to be fulfilled without losing the sale. Used in DDMRP buffer
  positioning to determine where decoupling points are needed.
- Demand per period: the average consumption rate of the product at this node
  (e.g. 100 units per week).

add_demand
  Required : node_id, product_id
  Optional : ctt_value, ctt_unit, demand_value, demand_period, notes
  Note     : verify that the SKU (node_id x product_id) exists before emitting.
             If absent, propose add_sku first.
  Note     : ctt_unit and demand_period accept: hours, days, weeks, months, years.

update_demand
  Required : node_id, product_id
  Optional : ctt_value, ctt_unit, demand_value, demand_period, notes

delete_demand
  Required : node_id, product_id
  Note     : cascades to map_demands. State explicitly in reasoning.

Note: map_demands visibility is excluded from v1 — opt-in display is manual.


Note: node_type and product_type creation are excluded from v1.
Note: map management and map visibility (map_nodes, map_flows, map_swim_lanes, map_demands)
      are excluded from v1. Do not emit actions on these entities.
```

### 5.4 Project-specific instructions

Each project can define a free-text block of instructions that contextualise Claude's behaviour for that specific project. Typical content includes naming conventions, geographic scope, preferred node types, client-specific terminology, and known constraints.

**Storage:** `project.ai_instructions` — a free-text string field in the project metadata object, persisted in the JSON file alongside `name`, `description`, and `created_by`.

**UI:** A dedicated button in the AI assistant panel header opens a modal with a textarea. Saving the modal marks the project as dirty (`DDS_STORE.markDirty()`). This modal is distinct from the project name/description modal.

**Injection:** When `project.ai_instructions` is non-empty, a fake user/assistant turn is inserted into the `messages` array immediately before the current project context message:

```javascript
{ role: 'user',      content: 'Project-specific instructions:\n' + ai_instructions }
{ role: 'assistant', content: 'Understood.' }
```

This pattern ensures Claude acknowledges and applies the instructions without embedding them in the system prompt, keeping the system prompt stable and versioned independently.

**Absent:** If `project.ai_instructions` is null, undefined, or an empty string, the block is not injected.

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
- A numbered list of actions, each rendered as a human-readable sentence (not raw JSON).
- An action count summary: *"3 actions to apply"*
- Two buttons: **Apply** and **Cancel**

### 6.3 Execution

Actions are executed sequentially in the order returned by Claude. After each write, DDScope resolves `new_*` references for subsequent actions. If any action fails, execution halts and the user is informed of which action failed and which actions were already applied.

### 6.4 Partial failure

In v1, there is no automatic rollback. Validation is all-or-nothing from the user's perspective. If execution halts mid-plan due to an error, the user is shown the list of applied and unapplied actions and can take manual corrective action. The recommended mitigation before any AI session is to duplicate the project (Save As).

---

## 7. Open Questions

| # | Question | Impact |
|---|---|---|
| 1 | Should the action list be embedded in the system prompt or injected dynamically per request? | System prompt design |
| 2 | What is the maximum acceptable context size? Large projects (50+ nodes, 100+ flows) may approach token limits. | Scalability |
| 3 | Should the user be able to edit the action plan before confirming? | **Resolved in v0.8:** all-or-nothing. |
| 4 | Should conversation history be maintained within a session (multi-turn)? | **Resolved in v0.5:** last turn only. |
| 5 | Swim-lane deletion: under what conditions should it be allowed via the assistant? | Action vocabulary v2 |
| 6 | Should the AI assistant gain write access to map-scoped entities in v2? | Action vocabulary v2 |
| 7 | BOM SKU pre-check: should DDScope enforce SKU existence before executing add_bom / add_bom_component, or trust Claude's reasoning? | Execution robustness |

---

*b2wise — Confidential*
