# Gemini Codebase Guide

This document provides a comprehensive guide to the codebase, intended for use by the Gemini AI agent. It outlines the project's architecture, development conventions, and key files, enabling Gemini to assist with development tasks effectively.

## Project Overview

This project is a web-based daily journal application. It allows users to create, edit, and manage their daily journal entries. The application is built using React and Vite, with a focus on providing a fast and responsive user experience.

The core functionality of the application includes:

*   A rich text editor for writing and formatting journal entries.
*   A calendar view for navigating between different dates.
*   The ability to sync journal entries with a Gist.

## Building and Running

The following commands are used to build and run the application:

*   **`npm run dev`**: Starts the development server.
*   **`npm run build`**: Builds the application for production.
*   **`npm run preview`**: Serves the production build locally for previewing.

## Development Conventions

The project follows standard React and JavaScript development conventions. Key conventions include:

*   **Component-Based Architecture**: The application is built using a component-based architecture, with each component responsible for a specific piece of functionality.
*   **State Management**: The application uses React's built-in state management capabilities to manage the application's state.
*   **Styling**: The application uses CSS Modules for styling, with each component having its own CSS file.
*   **Gist-based data persistence**: The application uses Gist to store and sync the user's data.
*   **Undo/Redo**: The application implements undo/redo functionality using a custom hook.
*   **Printing**: The application provides a print-friendly view of the schedule.
*   **Dark Mode**: The application supports dark mode.
*   **Internationalization**: The application is internationalized, with support for Arabic.
*   **Time calculations**: The application uses custom functions to calculate time durations and detect conflicts.
*   **Task management**: The application allows users to add, update, and delete tasks.
*   **Goal tracking**: The application allows users to set and track their weekly goals.
*   **Color customization**: The application allows users to customize the colors of the schedule.
*   **Import/Export**: The application allows users to import and export their data as JSON files.

## Key Files

*   **`src/App.jsx`**: The main component of the application. It manages the state of the application, including the schedule, colors, and user preferences. It also handles user interactions, such as adding, updating, and deleting tasks, as well as syncing the schedule with a Gist.
*   **`src/main.jsx`**: The entry point of the application. It renders the `App` component to the DOM.
*   **`package.json`**: The project's manifest file. It contains information about the project, such as its name, version, and dependencies.
*   **`vite.config.js`**: The configuration file for Vite. It is used to configure the development server, build process, and other aspects of the application.
*   **`data/default-schedule.json`**: A JSON file that contains the default schedule.
*   **`src/useGistSync.js`**: A custom hook that provides functionality for syncing the schedule with a Gist.
*   **`src/GistSettingsModal.jsx`**: A component that displays a modal for configuring the Gist sync settings.
*   **`src/SyncStatusIndicator.jsx`**: A component that displays the status of the Gist sync.
*   **`src/schedule_editor.jsx`**: A component that provides a UI for editing the schedule.
*   **`convert-times.js`**: A script that converts times in the schedule from 12-hour format to 24-hour format.
*   **`index.html`**: The main HTML file of the application.

This document should provide a good starting point for understanding the codebase. For more detailed information, please refer to the source code and the comments within the files.