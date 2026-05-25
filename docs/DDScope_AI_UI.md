# DDScope — AI Assistant UI
*v0.1 — May 2026*

*See also: [DDScope_AI_Assistant.md](DDScope_AI_Assistant.md) for the Claude communication contract and action vocabulary. [DDScope_UI.md](DDScope_UI.md) for the general UI spec.*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.1 | May 2026 | Extracted from DDScope_UI.md — AI Assistant Panel section |

---

## AI Assistant Panel

### Panel header and controls

**Header (first row, left to right):**

- **Title** — "🤖 AI Assistant" with "Claude" badge; flex-grows to fill available space.
- **Text size selector** — compact `<select>` with three options: A (15 px), A+ (19 px), A++ (23 px). Changes panel font size immediately. No persistence.
- **⚙ Instructions** — opens the project-specific instructions modal (existing behaviour).
- **↓ Export** — saves the current conversation to a `.md` file (see Export format below).
- **▶ Replay** — opens a file picker accepting `.md` files. On selection, the file is parsed for user messages and optional project-specific instructions. If at least one user message is found, the player bar appears.
- **✕ Close** — closes the panel.

**Player bar (second row, visible only when a replay file is loaded):**

- **Filename** — truncated display of the loaded file name; flex-grows.
- **Position counter** — `X / N` (messages sent / total).
- **▶ (Next)** — sends the next message as if typed by the user. Green accent color. Disabled when all messages have been sent.
- **⏭ (Run to end)** — sends all remaining messages sequentially. After each AI response, if an action plan is returned it is applied automatically (equivalent to clicking Apply); the runner then polls until the apply completes before sending the next message (max 30 s). Stops on AI error or action failure. Green accent color. Disabled when all messages have been sent.
- **ℹ (Instructions)** — opens the replay instructions modal (see below). Hidden if the replay file contains no instructions block.
- **✕ (Close player)** — resets replay state and hides the player bar. Does not affect conversation history.

**Replay instructions modal** — opened by the ℹ button or automatically after loading a file that contains instructions:

- Displays a textarea pre-filled with the instructions read from the file. Freely editable.
- **Copy to project** — replaces `project.ai_instructions` with the textarea content and marks the project dirty.
- **Close** — dismisses without saving.

**Post-load prompt** — if the loaded replay file contains a `**Project specific instructions:**` block, a small confirmation dialog appears: *"This file contains project-specific instructions. View them?"* → **View** opens the instructions modal; **No** dismisses.

---

### Export conversation file format

The exported `.md` file has the following structure:

```
# AI Assistant — <project name>

**Project specific instructions:**
​```
<ai_instructions content>
​```

**User:**
​```
<message>
​```

**Assistant:** <reasoning or answer>
```

The instructions block is omitted if `project.ai_instructions` is empty. Each user/assistant exchange is appended in order. The file can be reimported via the Replay button to replay the conversation as a script.

---

*b2wise — Confidential*
