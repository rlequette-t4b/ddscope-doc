# DDScope — SQLite MCP Setup

*Guide d'implémentation pour connecter Claude Desktop à une base de données SQLite locale via MCP. Utilisé pour stocker les données de test UI (scénarios, bugs, résultats) de façon queryable en session.*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 1.0 | May 2026 | Initial setup guide — MCP SQLite for UI test tracker |
| 1.1 | May 2026 | Correction: .db placé dans le repo (pas dans un répertoire séparé) — le repo n'est pas sur OneDrive |
| 1.2 | May 2026 | Package corrigé : `@modelcontextprotocol/server-sqlite` n'existe pas sur npm — remplacé par `@pollinations/mcp-server-sqlite` ; commande npx via chemin absolu nvm pour fiabilité Windows |

---

## Motivation

Le tracker de tests UI (`docs/DDScope_TestUI.md`) centralise la documentation de protocole. Le remplacer par une base SQLite locale permet :

- De requêter uniquement les données pertinentes en session (ex. scénarios `fail`, bugs `high`)
- De garder le fichier Markdown comme document générique de protocole (stable, petit)
- D'utiliser le même fichier `.db` comme source pour le générateur HTML (`generate_viewer.js`)

---

## Architecture cible

```
C:\Users\RemiLequette\Development\projects\ddscope\
  docs/
    DDScope_TestUI.md          ← protocole générique (données dans la base SQLite)
    DDScope_TestUI_watcher.md  ← auto-watcher VS Code
  tests/
    ddscope_tests.db           ← base SQLite (dans le repo, exclue de Git)
    schema.sql                 ← schéma SQL versionné dans Git
    generate_viewer.js         ← lit la base, génère le HTML
    DDScope_TestUI_viewer.html ← généré, jamais édité à la main
    backup/                    ← sauvegardes binaires et SQL (exclues de Git)
```

**Pourquoi le `.db` est exclu de Git mais reste dans le repo :**
Le fichier `.db` est binaire — commits lourds, merge conflicts impossibles. Il est exclu via `.gitignore`. Le repo n'est pas synchronisé par OneDrive, donc pas de risque de conflit de verrouillage. Seul `schema.sql` est versionné.

---

## Section 1 — Prérequis

| Composant | Rôle |
|---|---|
| Claude Desktop (Windows) | Interface utilisateur — accède au MCP |
| Node.js via nvm | Runtime — chemin : `C:\Users\RemiLequette\AppData\Roaming\nvm\v21.6.1\` |
| `@pollinations/mcp-server-sqlite` | Serveur MCP SQLite Node.js — installé à la volée via `npx` |
| VS Code + extension "SQLite Viewer" (Florian Gößler) | Supervision visuelle de la base en temps réel |

**Note sur le package :** `@modelcontextprotocol/server-sqlite` (référencé dans certaines docs) n'existe pas sur npm. Le package officiel Anthropic pour SQLite est distribué en Python via `uvx`. `@pollinations/mcp-server-sqlite` est l'équivalent Node.js qui ne nécessite pas Python.

---

## Section 2 — Création du fichier de base de données

Le serveur MCP ne crée pas le fichier `.db` automatiquement — il doit exister avant le démarrage.

1. Dans VS Code, créer un fichier vide nommé `ddscope_tests.db` dans `tests/`
2. Clic droit → **Copy Path** pour obtenir le chemin absolu exact à reporter dans la config

---

## Section 3 — Configuration de Claude Desktop

Fichier de configuration à modifier :
```
%APPDATA%\Claude\claude_desktop_config.json
```

Bloc à insérer dans `mcpServers` :

```json
{
  "mcpServers": {
    "sqlite": {
      "command": "C:\\Users\\RemiLequette\\AppData\\Roaming\\nvm\\v21.6.1\\npx.cmd",
      "args": [
        "-y",
        "@pollinations/mcp-server-sqlite",
        "C:\\Users\\RemiLequette\\Development\\projects\\ddscope\\tests\\ddscope_tests.db"
      ]
    }
  }
}
```

**Notes Windows :**
- Tous les antislashs du chemin doivent être doublés (`\\`) en JSON.
- Le chemin vers `npx.cmd` est absolu via nvm pour éviter les problèmes de résolution de PATH sous Windows. Adapter si la version Node change (`v21.6.1`).
- Le chemin vers la base est passé directement en argument positionnel (pas de flag `--db`).

Redémarrer Claude Desktop après la modification.

---

## Section 4 — Schéma de la base

Le schéma courant est versionné dans `tests/schema.sql`. Se référer à ce fichier pour la définition à jour des tables et de la vue.

Résumé des tables :

| Table / Vue | Rôle |
|---|---|
| `test_scenarios` | Scénarios de test — id, area, scenario, feature, playwright, instructions, notes |
| `test_issues` | Bugs et améliorations — id, type, description, priority, status (`open`/`fixed`/`wontfix`) |
| `test_scenario_issues` | Table de jointure — scenario_id, issue_id |
| `v_scenario_status` | Vue calculée — status (`pass`/`fail`/`empty`), compteurs open/fixed/wontfix |

Le status d'un scénario est entièrement calculé depuis ses issues liées via `v_scenario_status`. Ne pas lire `test_scenarios.status` directement — c'est un champ legacy.

---

## Section 5 — Migration initiale

Les données de départ ont été insérées lors de la mise en place de la base. Pour référence, le schéma initial et les données d'origine sont dans l'historique Git de `tests/schema.sql`.

---

## Section 6 — Requêtes types en session

```sql
-- Scénarios avec issues ouvertes
SELECT id, scenario, status, open_count
FROM v_scenario_status
WHERE open_count > 0
ORDER BY id;

-- Issues ouvertes haute priorité
SELECT id, type, description, priority
FROM test_issues
WHERE status = 'open' AND priority = 'high'
ORDER BY id;

-- Issues liées à un scénario
SELECT i.id, i.type, i.description, i.status, i.priority
FROM test_issues i
JOIN test_scenario_issues si ON si.issue_id = i.id
WHERE si.scenario_id = '2.3'
ORDER BY i.id;

-- Scénarios liés à une issue
SELECT s.id, s.scenario, v.status
FROM test_scenarios s
JOIN test_scenario_issues si ON si.scenario_id = s.id
JOIN v_scenario_status v ON v.id = s.id
WHERE si.issue_id = 'B4'
ORDER BY s.id;

-- Résumé par status calculé
SELECT status, COUNT(*) as count
FROM v_scenario_status
GROUP BY status;
```

---

## Section 7 — Intégration avec generate_viewer.js

`generate_viewer.js` lit `v_scenario_status`, `test_issues`, et `test_scenario_issues` via `better-sqlite3` et génère `DDScope_TestUI_viewer.html`. Le viewer expose deux vues (Scenarios / Issues) avec filtres et détail sur clic.

```bash
node tests/generate_viewer.js
```

---

## Section 8 — Versioning et sauvegarde

### Git

Le `.gitignore` à la racine du repo exclut :
```
tests/*.db
tests/*.sqlite
tests/backup/*.db
tests/backup/*.sqlite
tests/backup/*.sql
```

Versionner uniquement `tests/schema.sql` — mis à jour à chaque modification de schéma.

### Sauvegarde

Les sauvegardes sont stockées dans `tests/backup/` (répertoire versionné via `.gitkeep`, contenu exclu de Git).

**Méthode 1 — Binaire à froid (manuelle) :**
Fermer Claude Desktop, copier `ddscope_tests.db` dans `tests/backup/`.

**Méthode 2 — À chaud via Claude :**
*"Exécute la commande de sauvegarde à chaud pour cloner la base dans `tests/backup/ddscope_tests_backup.db`."*

**Méthode 3 — Export SQL complet :**
*"Génère un export SQL complet de la base et sauvegarde-le dans `tests/backup/backup_data.sql`."*

---

## Section 9 — Protocole du tracker en session

Le domaine **UI Testing** dans `docs/README.md` charge `docs/DDScope_TestUI.md` pour le protocole (conventions, catégories, règles de calcul du status). Les données sont requêtées directement dans la base via MCP SQLite — ne pas chercher de données dans le fichier Markdown.

---

*b2wise — Confidential*
