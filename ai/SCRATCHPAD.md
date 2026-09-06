Use these MAIN CONTSTRAINTS for all prompts in this chat session:

Only operate inside src/ and tests/
Ignore dist/, node_modules/, logs/
Keep terminal output small (use head, tail, grep)
Use small diffs
Ask before reading large files
Summarize instead of loading huge JSON
First, produce a step-by-step plan
Wait for my approval before making any changes
If a JSON file is huge, summarize the structure of it without loading the full file

refactor favorite page. should look like this:
LINE 1: "Mina favoriter" (or "Delade favoriter") + sorting options + button for "Dela" (my favorites page) or "Ta bort" (shared favorites page).
LINE 2: "{USERNAME} delar den här listan med dig"

add div under active-tab-heading. should contain information about this tab (if present). for tab-program it should be "Glöm inte att även titta på delevenemang i menyn ovan. Dessa är programpunkter som hittats i beskrivningen av evenemang.". should have slightly differing background to stand out.

program-sort-controls should be on own line, together with remove-shared or share-favorites button.

shared page header should be "Delade favoritevenemang från {USERNAME}"
