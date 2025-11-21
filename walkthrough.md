# Walkthrough: Polls Page Features

## Overview
The Polls page (`/poll`) allows users to view active polls, vote on dates, and (for admins) manage teams.

## Features

### 1. Viewing Polls
- **Streaming Data**: The page loads the skeleton structure immediately while fetching poll data in the background.
- **Active Polls**: The most recent open poll is displayed prominently.

### 2. Voting
- **Identity Selection**: Users must select their name from a dropdown to vote.
- **Voting Options**: Users can vote "Yes" or "No" (by deselecting) for each proposed date/time.
- **Real-time Updates**: Vote counts and the bar chart update instantly upon voting.
- **View Voters**: Click "Vedi chi" to expand the list of voters for a specific option.

### 3. Creating Polls (Admin)
- **New Poll Dialog**: Click "Crea Sondaggio" to open the dialog.
- **Default Location**: Set a default location for all generated options.
- **Schedule Generation**: Choose between "Settimana Intera" or "Solo Festivi (Ven-Dom)" to automatically generate date options.
- **Custom Options**: Manually add or remove specific dates/times.

### 4. Team Management (Admin)
- **Drag and Drop**: Drag players from the "Disponibili" list to "Squadra A" or "Squadra B".
- **Team Balancing**: Visual feedback helps in balancing the teams.
- **Confirm Fixture**: Once teams are set, click "Conferma convocati" to generate the match fixture.

## Technical Details
- **State Management**: Uses Svelte 5 Runes (`$state`, `$derived`, `$effect`) for reactivity.
- **Charts**: Uses `layerchart` for the voting distribution bar chart.
- **UI Components**: Built with Shadcn UI components (Card, Dialog, Button, etc.).
