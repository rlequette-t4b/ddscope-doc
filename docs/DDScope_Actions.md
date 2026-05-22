# DDScope — Action Vocabulary
*v0.1 — Draft — May 2026*

*See also: [DDScope_DataModel.md](DDScope_DataModel.md) for entity definitions and cascade rules. [DDScope_AI_Assistant.md](DDScope_AI_Assistant.md) for the Claude communication contract. [DDScope_Modules.md](DDScope_Modules.md) for the `DDS_ACTIONS` module definition.*

---

## Version History- [DDScope — Action Vocabulary](#ddscope--action-vocabulary)
- [DDScope — Action Vocabulary](#ddscope--action-vocabulary)
  - [Version History- DDScope — Action Vocabulary](#version-history--ddscope--action-vocabulary)
  - [1. Purpose](#1-purpose)
  - [2. Conventions](#2-conventions)
    - [2.1 Action format](#21-action-format)
    - [2.2 Temporary ID convention (`new_*`)](#22-temporary-id-convention-new_)
    - [2.3 Validation](#23-validation)
  - [3. Action Vocabulary](#3-action-vocabulary)
    - [3.1 Nodes](#31-nodes)
    - [3.2 Flows](#32-flows)
    - [3.3 Products](#33-products)
    - [3.4 SKUs](#34-skus)
    - [3.5 Swim-lanes](#35-swim-lanes)
    - [3.6 BOMs](#36-boms)
    - [3.7 Demands](#37-demands)
  - [4. Cross-cutting Rules](#4-cross-cutting-rules)
    - [4.1 Product-node pattern](#41-product-node-pattern)
    - [4.2 Cascade obligations](#42-cascade-obligations)
    - [4.3 SKU pre-check for BOMs and demands](#43-sku-pre-check-for-boms-and-demands)
  - [5. Versioning](#5-versioning)
    - [v1 — included](#v1--included)
    - [v1 — excluded](#v1--excluded)
    - [v2 — candidates](#v2--candidates)
  - [6. Implementation Notes](#6-implementation-notes)
    - [6.1 Store operations per action](#61-store-operations-per-action)
      - [Nodes](#nodes)
      - [Flows](#flows)
      - [Products](#products)
      - [SKUs](#skus)
      - [Swim-lanes](#swim-lanes)
      - [BOMs](#boms)
      - [Demands](#demands)
    - [6.2 describe() label format](#62-describe-label-format)
    - [6.3 getVocabularyText() reference output](#63-getvocabularytext-reference-output)


| Version | Date | Summary |
|---|---|---|
| 0.1 | May 2026 | Initial extraction from DDScope_AI_Assistant.md §3 and §5.3 |

---

## 1. Purpose

This document defines the DDScope action vocabulary — the complete set of operations that can be applied to the functional model. Actions are the interface between intent (user instruction, AI response, macro, UI operation) and the data layer (`DDS_STORE`).

`DDS_ACTIONS` (SCRIPT 1850) is the authoritative runtime implementation of this vocabulary. Any caller — the AI assistant, the UI, or future automation — goes through `DDS_ACTIONS.execute()`.

Actions operate exclusively on the **functional layer** (nodes, flows, products, SKUs, swim-lanes, BOMs, demands). Map-scoped operations (canvas positions, visibility) are excluded from this vocabulary.

---

## 2. Conventions

### 2.1 Action format

Each action is a JSON object with a `type` field identifying the operation, plus domain-specific fields:

```json
{ "type": "add_node", "name": "Fournisseur A", "swim_lane_id": "3" }
{ "type": "add_flow", "source_id": "new_node_1", "target_id": "12" }
- [DDScope — Action Vocabulary](#ddscope--action-vocabulary)
  - [Version History](#version-history)
  - [1. Purpose](#1-purpose)
  - [2. Conventions](#2-conventions)
    - [2.1 Action format](#21-action-format)
    - [2.2 Temporary ID convention (`new_*`)](#22-temporary-id-convention-new_)
    - [2.3 Validation](#23-validation)
  - [3. Action Vocabulary](#3-action-vocabulary)
    - [3.1 Nodes](#31-nodes)
    - [3.2 Flows](#32-flows)
    - [3.3 Products](#33-products)
    - [3.4 SKUs](#34-skus)
    - [3.5 Swim-lanes](#35-swim-lanes)
    - [3.6 BOMs](#36-boms)
    - [3.7 Demands](#37-demands)
  - [4. Cross-cutting Rules](#4-cross-cutting-rules)
    - [4.1 Product-node pattern](#41-product-node-pattern)
    - [4.2 Cascade obligations](#42-cascade-obligations)
    - [4.3 SKU pre-check for BOMs and demands](#43-sku-pre-check-for-boms-and-demands)
  - [5. Versioning](#5-versioning)
    - [v1 — included](#v1--included)
    - [v1 — excluded](#v1--excluded)
    - [v2 — candidates](#v2--candidates)
  - [6. Implementation Notes](#6-implementation-notes)
    - [6.1 Store operations per action](#61-store-operations-per-action)
      - [Nodes](#nodes)
      - [Flows](#flows)
      - [Products](#products)
      - [SKUs](#skus)
      - [Swim-lanes](#swim-lanes)
      - [BOMs](#boms)
      - [Demands](#demands)
    - [6.2 describe() label format](#62-describe-label-format)
    - [6.3 getVocabularyText() reference output](#63-getvocabularytext-reference-output)
```

Actions are passed as an ordered array. `DDS_ACTIONS.execute(actions)` applies them sequentially.

### 2.2 Temporary ID convention (`new_*`)

When an action creates an entity that is referenced by subsequent actions in the same plan, the creating action must include a temporary ID in the form `"id": "new_<entity>_N"` (e.g. `"id": "new_node_1"`, `"id": "new_bom_2"`).

`DDS_ACTIONS.execute()` resolves these references sequentially: as each action is applied and a real ID is assigned by `DDS_STORE`, all subsequent actions in the plan that reference the same `new_*` value are updated before execution.

```json
[
  { "type": "add_node",          "id": "new_node_1", "name": "Entrepôt Lyon" },
  { "type": "add_flow",          "source_id": "5", "target_id": "new_node_1" },
  { "type": "add_sku",           "node_id": "new_node_1", "product_id": "8" }
]
```

Temporary IDs are local to the plan — they are never persisted.

### 2.3 Validation

`DDS_ACTIONS` rejects any action whose `type` is not in the vocabulary before any write is performed. An unknown action type halts execution immediately with no partial application.

---

## 3. Action Vocabulary

### 3.1 Nodes

| Action | Required | Optional |
|---|---|---|
| `add_node` | `name` | `type_code`, `swim_lane_id`, `tags`, `notes` |
| `update_node` | `node_id` | `name`, `type_code`, `swim_lane_id`, `tags`, `notes` |
| `delete_node` | `node_id` | — |
| `assign_node_to_lane` | `node_id`, `swim_lane_id` | — |

**`add_node`** — `x, y` are not accepted. Canvas position is map-specific and is never set via actions. Include `"id": "new_node_N"` when the node is referenced by subsequent actions in the same plan.

**`delete_node`** — cascades to all flows where the node is source or target, all SKUs for that node, all BOMs and BOM components for that node, and all demands for that node. See `DDScope_DataModel.md` §17 for the full cascade definition. All cascade consequences must be listed explicitly in the action plan.

### 3.2 Flows

| Action | Required | Optional |
|---|---|---|
| `add_flow` | `source_id`, `target_id` | `lead_time_value`, `lead_time_unit`, `bidirectional`, `tags`, `notes` |
| `update_flow` | `flow_id` | `lead_time_value`, `lead_time_unit`, `bidirectional`, `tags`, `notes` |
| `delete_flow` | `flow_id` | — |
| `reroute_flow` | `flow_id` + at least one of `new_source_id`, `new_target_id` | `new_source_id`, `new_target_id` |
| `add_product_to_flow` | `flow_id`, `product_id` | — |
| `remove_product_from_flow` | `flow_id`, `product_id` | — |

**`add_flow`** — a flow with no products is valid. Include `"id": "new_flow_N"` when referenced by subsequent actions.

**`delete_flow`** — cascades to orphan SKUs on source and target nodes (SKUs whose product no longer appears on any other connected flow), BOM cascade for each orphan SKU, and demand cascade for each deleted SKU. See `DDScope_DataModel.md` §17.

### 3.3 Products

| Action | Required | Optional |
|---|---|---|
| `add_product` | `name` | `type_code`, `tags`, `notes` |
| `update_product` | `product_id` | `name`, `type_code`, `tags`, `notes` |
| `delete_product` | `product_id` | — |

**`add_product`** — include `"id": "new_product_N"` when referenced by subsequent actions.

**`delete_product`** — cascades to all flows carrying the product, all SKUs, and all demands associated with those SKUs. See `DDScope_DataModel.md` §17. All cascade consequences must be listed explicitly in the action plan.

### 3.4 SKUs

A SKU is the association between a node and a product. Tags express the nature of the association (e.g. `buffer`, `stock`, `transit`).

| Action | Required | Optional |
|---|---|---|
| `add_sku` | `node_id`, `product_id` | `tags`, `notes` |
| `update_sku` | `node_id`, `product_id` | `tags`, `notes` |
| `remove_sku` | `node_id`, `product_id` | — |

**`remove_sku`** — cascades to the demand for that node × product pair if it exists, and to its `map_demands` records. See `DDScope_DataModel.md` §4.

### 3.5 Swim-lanes

| Action | Required | Optional |
|---|---|---|
| `add_swim_lane` | `name` | `color` |
| `update_swim_lane` | `swim_lane_id` | `name`, `color` |

**`add_swim_lane`** — include `"id": "new_lane_N"` when referenced by subsequent actions.

> Swim-lane deletion is excluded from v1. See §5.

### 3.6 BOMs

A BOM describes a transformation performed by a node: one output product manufactured from one or more input components with quantities. A node can have multiple BOMs (one per output product).

| Action | Required | Optional |
|---|---|---|
| `add_bom` | `node_id`, `output_product_id` | `notes` |
| `update_bom` | `bom_id` | `output_product_id`, `notes` |
| `delete_bom` | `bom_id` | — |
| `add_bom_component` | `bom_id`, `product_id`, `quantity` | `notes` |
| `update_bom_component` | `bom_id`, `product_id` | `quantity`, `notes` |
| `remove_bom_component` | `bom_id`, `product_id` | — |

**`add_bom`** — include `"id": "new_bom_N"` when referenced by subsequent `add_bom_component` actions. The output product must exist as a SKU on the node before this action is emitted.

**`add_bom_component`** — the component product must exist as a SKU on the node before this action is emitted.

**`delete_bom`** — cascades to all its `bom_components`. See `DDScope_DataModel.md` §6.

### 3.7 Demands

A demand record captures the CTT (Customer Tolerance Time) and average demand per period for a SKU. At most one demand per SKU.

**CTT (Customer Tolerance Time):** the maximum time a customer is willing to wait for an order to be fulfilled without losing the sale. Used in DDMRP buffer positioning to determine where decoupling points are needed.

**Demand per period:** the average consumption rate of the product at this node (e.g. 100 units per week).

| Action | Required | Optional |
|---|---|---|
| `add_demand` | `node_id`, `product_id` | `ctt_value`, `ctt_unit`, `demand_value`, `demand_period`, `notes` |
| `update_demand` | `node_id`, `product_id` | `ctt_value`, `ctt_unit`, `demand_value`, `demand_period`, `notes` |
| `delete_demand` | `node_id`, `product_id` | — |

**Unit values** for `ctt_unit` and `demand_period`: `hours`, `days`, `weeks`, `months`, `years`.

**`add_demand`** — the SKU (node × product pair) must exist before this action is emitted.

**`delete_demand`** — cascades to `map_demands`. See `DDScope_DataModel.md` §5.

> Map demand visibility (`map_demands`) is excluded from the action vocabulary. Opt-in display is a manual operation via the UI.

---

## 4. Cross-cutting Rules

### 4.1 Product-node pattern

**Default behaviour:** whenever a new product is introduced in a plan, apply the product-node pattern:

1. Emit `add_product` if the product does not exist.
2. Emit `add_node` with `name` = product name, `type_code` = the type marked `is_product_node_default` in `node_types` (fall back to `is_default`, then first type), `swim_lane_id` = `default_swim_lane_id` of that type unless specified otherwise.
3. Emit `add_sku` for the node × product pair.
4. Emit `add_flow` if the product is described as a source or destination of a flow.

**Exception — `add_product_to_flow` only:** when the intent is explicitly to add a product to an existing flow between two existing non-product nodes (both endpoints already exist and neither represents a product), use `add_product_to_flow` instead. Do not create a node for the product in this case.

In all other cases — new product, product as a flow endpoint, product placed in a lane — apply the product-node pattern.

### 4.2 Cascade obligations

When an action implicitly triggers cascade deletions (see `DDScope_DataModel.md` §17), all cascade consequences must be listed explicitly as separate actions in the plan. Implicit cascades are not assumed — they must be stated.

Actions subject to this rule: `delete_node`, `delete_flow`, `delete_product`, `delete_bom`, `remove_sku`.

### 4.3 SKU pre-check for BOMs and demands

Before emitting `add_bom`, `add_bom_component`, or `add_demand`, verify that the required SKU (node × product pair) exists. If absent, emit `add_sku` first in the same plan.

---

## 5. Versioning

### v1 — included

All actions in §3 above.

### v1 — excluded

| Exclusion | Reason |
|---|---|
| Swim-lane deletion | Risk of unintended cascade on node assignments |
| Node type and product type management | Configuration-level entities managed in Settings |
| Map management (`maps`, `map_nodes`, `map_flows`, `map_swim_lanes`, `map_demands`) | Presentation layer — manual operation via map UI |
| Map demand visibility (`map_demands`) | Opt-in display — manual operation |

### v2 — candidates

- Swim-lane deletion with explicit cascade confirmation
- Map-scoped operations (add/remove elements from a map)
- Tag color management

---

## 6. Implementation Notes

This section provides the information required to implement `DDS_ACTIONS`. It is not part of the vocabulary contract — it is a guide for the developer and the AI assistant writing the module.

### 6.1 Store operations per action

For each action, the table below lists the `DDS_STORE` operations to perform and any non-trivial side effects. Cascade rules are defined in `DDScope_DataModel.md` §17 and must be applied by the caller (the action plan), not by `DDS_ACTIONS` internally — `DDS_ACTIONS.execute()` applies each action in sequence as listed, without inferring implicit cascades.

#### Nodes

| Action | Store operations |
|---|---|
| `add_node` | `DDS_STORE.insert('nodes', { name, type_code, swim_lane_id, tags, notes })` |
| `update_node` | `DDS_STORE.update('nodes', { id: node_id }, { ...fields })` |
| `delete_node` | `DDS_STORE.remove('nodes', { id: node_id })` |
| `assign_node_to_lane` | `DDS_STORE.update('nodes', { id: node_id }, { swim_lane_id })` |

#### Flows

| Action | Store operations |
|---|---|
| `add_flow` | `DDS_STORE.insert('flows', { source_node_id, target_node_id, product_ids: [], tags, lead_time_value, lead_time_unit, bidirectional: false, notes })` |
| `update_flow` | `DDS_STORE.update('flows', { id: flow_id }, { ...fields })` |
| `delete_flow` | `DDS_STORE.remove('flows', { id: flow_id })` |
| `reroute_flow` | `DDS_STORE.update('flows', { id: flow_id }, { source_node_id: new_source_id?, target_node_id: new_target_id? })` |
| `add_product_to_flow` | `DDS_STORE.update('flows', { id: flow_id }, { product_ids: [...existing, product_id] })` |
| `remove_product_from_flow` | `DDS_STORE.update('flows', { id: flow_id }, { product_ids: existing.filter(id !== product_id) })` |

(update_flow already uses `{ ...fields }` — bidirectional is included automatically.)

#### Products

| Action | Store operations |
|---|---|
| `add_product` | `DDS_STORE.insert('products', { name, type_code, tags, notes })` |
| `update_product` | `DDS_STORE.update('products', { id: product_id }, { ...fields })` |
| `delete_product` | `DDS_STORE.remove('products', { id: product_id })` |

#### SKUs

| Action | Store operations |
|---|---|
| `add_sku` | `DDS_STORE.insert('skus', { node_id, product_id, tags, notes })` |
| `update_sku` | `DDS_STORE.update('skus', { node_id, product_id }, { tags?, notes? })` |
| `remove_sku` | `DDS_STORE.remove('skus', { node_id, product_id })` |

#### Swim-lanes

| Action | Store operations |
|---|---|
| `add_swim_lane` | `DDS_STORE.insert('swim_lanes', { name, color })` |
| `update_swim_lane` | `DDS_STORE.update('swim_lanes', { id: swim_lane_id }, { name?, color? })` |

#### BOMs

| Action | Store operations |
|---|---|
| `add_bom` | `DDS_STORE.insert('boms', { node_id, output_product_id, notes })` |
| `update_bom` | `DDS_STORE.update('boms', { id: bom_id }, { output_product_id?, notes? })` |
| `delete_bom` | `DDS_STORE.remove('boms', { id: bom_id })` |
| `add_bom_component` | `DDS_STORE.insert('bom_components', { bom_id, product_id, quantity, notes })` |
| `update_bom_component` | `DDS_STORE.update('bom_components', { bom_id, product_id }, { quantity?, notes? })` |
| `remove_bom_component` | `DDS_STORE.remove('bom_components', { bom_id, product_id })` |

**`_created_id` on applied actions:** after each successful `insert`, `execute()` attaches `_created_id` to the action object in `applied`, set to the real ID assigned by `DDS_STORE`. This allows callers (e.g. `DDS_AI_UI`) to place newly created nodes and flows on the active map without a separate store query. Actions that do not create a new record (update, delete, remove) do not have `_created_id`.

#### Demands

| Action | Store operations |
|---|---|
| `add_demand` | `DDS_STORE.insert('demands', { node_id, product_id, ctt_value, ctt_unit, demand_value, demand_period, notes })` |
| `update_demand` | `DDS_STORE.update('demands', { node_id, product_id }, { ...fields })` |
| `delete_demand` | `DDS_STORE.remove('demands', { node_id, product_id })` |

---

### 6.2 describe() label format

`DDS_ACTIONS.describe(actions)` performs two passes:

**Pass 1 — collect `new_*` labels:** iterate the action list. For each action that includes `"id": "new_*"`, record the label to use for that temporary ID. The label is the `name` field of the action when present (`add_node`, `add_product`, `add_swim_lane`), or a fallback derived from the action type (`"new BOM"`, `"new flow"`).

**Pass 2 — build labels:** for each action, resolve all ID references (real IDs from `DDS_STORE`, `new_*` from pass 1) and return the label string below.

Labels are in English. Entity names are quoted. Arrow direction is always `→` regardless of map direction.

| Action | Label format |
|---|---|
| `add_node` | `Add node "{name}"` |
| `update_node` | `Update node "{name}"` |
| `delete_node` | `Delete node "{name}"` |
| `assign_node_to_lane` | `Assign node "{name}" to lane "{lane_name}"` |
| `add_flow` | `Add flow {source_name} → {target_name}` — if `bidirectional: true`: `Add flow {source_name} ↔ {target_name}` |
| `update_flow` | `Update flow {source_name} → {target_name}` — if `bidirectional: true`: `Update flow {source_name} ↔ {target_name}` |
| `delete_flow` | `Delete flow {source_name} → {target_name}` |
| `reroute_flow` | `Reroute flow: {source_name} → {target_name}` (resolved after rerouting) |
| `add_product_to_flow` | `Add product "{product_name}" to flow {source_name} → {target_name}` |
| `remove_product_from_flow` | `Remove product "{product_name}" from flow {source_name} → {target_name}` |
| `add_product` | `Add product "{name}"` |
| `update_product` | `Update product "{name}"` |
| `delete_product` | `Delete product "{name}"` |
| `add_sku` | `Add SKU: node "{node_name}" × product "{product_name}"` |
| `update_sku` | `Update SKU: node "{node_name}" × product "{product_name}"` |
| `remove_sku` | `Remove SKU: node "{node_name}" × product "{product_name}"` |
| `add_swim_lane` | `Add swim-lane "{name}"` |
| `update_swim_lane` | `Update swim-lane "{name}"` |
| `add_bom` | `Add BOM: node "{node_name}" → output "{product_name}"` |
| `update_bom` | `Update BOM on node "{node_name}"` |
| `delete_bom` | `Delete BOM on node "{node_name}"` |
| `add_bom_component` | `Add BOM component: "{product_name}" × {quantity} to BOM on "{node_name}"` |
| `update_bom_component` | `Update BOM component "{product_name}" on node "{node_name}"` |
| `remove_bom_component` | `Remove BOM component "{product_name}" from BOM on "{node_name}"` |
| `add_demand` | `Add demand: node "{node_name}" × product "{product_name}"` |
| `update_demand` | `Update demand: node "{node_name}" × product "{product_name}"` |
| `delete_demand` | `Delete demand: node "{node_name}" × product "{product_name}"` |
| unknown type | `Unknown action: {type}` — no throw |

---

### 6.3 getVocabularyText() reference output

The following is the reference text that `DDS_ACTIONS.getVocabularyText()` must produce. It is injected into the Claude system prompt at `{{ACTION_VOCABULARY}}`. `DDS_ACTIONS.ACTIONS` is the structured source of truth from which this text is derived.

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
  Optional : lead_time_value, lead_time_unit, bidirectional, tags, notes
  Note     : a flow with no products is valid.
  Note     : bidirectional (boolean, default false) — when true, the flow is rendered
             with arrowheads at both ends. Use for symmetric exchanges (inter-site
             transfers, overflow replenishment). Same products and lead time apply
             in both directions. Do not create two flows for a bidirectional exchange.
  Note     : include "id": "new_flow_N" in this action when referenced
             by subsequent actions in the same plan.

update_flow
  Required : flow_id
  Optional : lead_time_value, lead_time_unit, bidirectional, tags, notes

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

---

*b2wise — Confidential*
