# AI Rules for Träningsapp

This document outlines the core technologies used in this application and provides guidelines for using specific libraries to maintain consistency and best practices.

## Tech Stack

*   **React**: A JavaScript library for building user interfaces.
*   **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript, enhancing code quality and maintainability.
*   **Vite**: A fast build tool that provides an instant development server and optimized builds.
*   **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs.
*   **shadcn/ui**: A collection of reusable components built with Radix UI and Tailwind CSS.
*   **React Router**: A standard library for routing in React applications.
*   **Supabase**: An open-source Firebase alternative providing a PostgreSQL database, authentication, and serverless functions.
*   **Tanstack Query (React Query)**: A powerful library for managing server state, including data fetching, caching, and synchronization.
*   **date-fns**: A modern JavaScript date utility library.
*   **Sonner**: A simple and elegant toast component for notifications.
*   **Lucide React**: A collection of beautiful and customizable open-source icons.

## Library Usage Rules

To ensure consistency and maintainability, please adhere to the following guidelines when developing:

*   **UI Components**: Always prioritize `shadcn/ui` components for building the user interface. If a specific component is not available in `shadcn/ui`, create a new, small, and focused custom component using Tailwind CSS.
*   **Styling**: Use Tailwind CSS exclusively for all styling. Avoid writing custom CSS files unless it's for global styles defined in `src/index.css`.
*   **Routing**: Use `react-router-dom` for all client-side navigation. All main application routes should be defined within `src/App.tsx`.
*   **Server State Management**: For fetching, caching, and updating server data (e.g., data from Supabase), use `@tanstack/react-query`.
*   **Authentication & Database**: All interactions with authentication, the database, and serverless functions should be done using the `@supabase/supabase-js` client.
*   **Icons**: Use icons from the `lucide-react` library.
*   **Date Manipulation**: For any date formatting, parsing, or manipulation, use `date-fns`.
*   **Toast Notifications**: For displaying user feedback messages (success, error, info), use the `sonner` toast component.
*   **Utility Functions**: For combining Tailwind CSS classes, use the `cn` utility function from `src/lib/utils.ts`.