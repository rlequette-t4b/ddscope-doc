# Patch — DDScope_Architecture.md
## Motif : ajout DDS_TOOLS (SCRIPT 40) + TX (SCRIPT 1865) + DDS_TX_HELPER (SCRIPT 1870)

---

### 1. Version History — ajouter une ligne

**Après la ligne v2.2 :**

```
| 2.3 | May 2026 | DDS_TOOLS (SCRIPT 40) added — transversal utility module (DDS_TOOLS.log levelled logger). TX (SCRIPT 1865) and DDS_TX_HELPER (SCRIPT 1870) added — transaction label catalogue and UI transaction wrapper. |
```

---

### 2. Section 3 — Functional layer modules table

**Ajouter une ligne en tête du tableau (avant DDS_COLORS) :**

```
| `DDS_TOOLS` | Transversal utilities — `DDS_TOOLS.log` levelled logger (debug/info/warn/error/off), localStorage-persisted level |
```

**Ajouter deux lignes à la fin du tableau (après DDS_TRANSACTIONS) :**

```
| `TX` | Transaction label catalogue — centralised constants for `DDS_TRANSACTIONS.begin()` |
| `DDS_TX_HELPER` | UI transaction wrapper — `DDS_TX_HELPER.run(label, fn, onSuccess?)` encapsulates begin/commit/rollback; temporary, pending presentation layer refactor |
```

---

### 3. Section 3 — bloc de code du load order (si présent)

Si un tableau ou commentaire liste l'ordre de chargement des SCRIPT blocks, ajouter :

```
SCRIPT 40   — DDS_TOOLS        (transversal utilities — loaded first)
SCRIPT 50   — DDS_SETTINGS     (existing)
...
SCRIPT 1860 — DDS_TRANSACTIONS
SCRIPT 1865 — TX               (transaction label catalogue)
SCRIPT 1870 — DDS_TX_HELPER    (UI transaction wrapper)
```
