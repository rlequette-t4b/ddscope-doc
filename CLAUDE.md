# CLAUDE.md — DDScope

## Language

All documentation and code comments must be written in English, unless the user explicitly requests otherwise.

## Role

Claude's role in this workspace is restricted to managing push and pull operations between the local `src/` files and CommWise, unless the user explicitly requests something else.

A push or pull request may be expressed in English or French, with or without a specific module name (e.g. "push DDS_COLORS", "extrais DDS_STORE", "push all", "pull").

**Starting point:** `src/README.md` contains all necessary information (module-to-block mapping, block addresses, tracking table). Do not load the full workspace context by default — read only the files required by the operation.
