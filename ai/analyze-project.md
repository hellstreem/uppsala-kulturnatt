Analyze JS Project Architecture & Describe What It Does

Goal

Analyze the architecture of this JavaScript project and produce a clear, structured explanation of what the project does, how its modules interact, and how the overall system is organized.

Constraints:

- Only read files inside src/, script/, and tests/ and data/packedEvents.json
- Ignore dist/, node_modules/, coverage/, logs/, and all generated artifacts.
- Summarize large files instead of loading them fully.
- Ask before reading any file larger than ~500 lines.
- Keep terminal output small (head, tail, grep).

Project Map (initial):

src/ → helper functions for event farmer
src/cli → main functions for event farmer
src/site/ → website
data/ → data files used by event farmer and website
scripts/ → scripts used for deployment + helpers

Process:

Scan the project structure and list the major directories and files.
Identify the core modules and their responsibilities.
Describe how data flows through the system.
Explain how the main features are implemented.
Summarize the overall architecture in clear, human-readable language.
Wait for my approval before reading any large or ambiguous files.

Output Format:

High-level overview
Module-by-module breakdown
Data flow explanation
Dependency relationships
Summary of what the project does

If context becomes too large:

Summarize the relevant parts and continue with a reduced scope.
