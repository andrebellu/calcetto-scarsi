# Task: Optimize Polls Page

## Objective
Optimize the Polls page for better performance, user experience, and accessibility.

## Status
**Completed**

## Tasks
- [x] Implement SvelteKit streaming and skeleton loaders for improved initial load.
- [x] Fix syntax errors (e.g., `chartDataBars` definition) and HTML structure issues.
- [x] Ensure correct data binding for voting preferences (using local state `options` and `counts`).
- [x] Fix linting errors (missing `class` props in `Card` components).
- [x] Address accessibility warnings (e.g., associating labels with inputs).
- [x] Verify drag-and-drop functionality for team management.
- [x] Add default location and schedule length options to poll creation dialog.

## Notes
- The page now uses `{#await}` blocks to handle streaming data from the server.
- Voting updates are optimistic for better responsiveness.
- Drag-and-drop logic handles moving players between "Available", "Team A", and "Team B".
