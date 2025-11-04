# Google AI Studio: World-Class Front-End Build for SystonApp

## 1. Project Overview

You are tasked with building a world-class, production-ready front-end for **SystonApp**, a multi-tenant SaaS platform for grassroots football clubs. The front-end will be a Next.js web application that is visually stunning, highly performant, bug-free, and provides an amazing user experience.

The existing codebase includes a backend built with Cloudflare Workers and a React Native mobile app. This project is to build the **web front-end** component.

## 2. High-Level Goals

*   **World-Class UI/UX:** The application should be beautiful, intuitive, and a pleasure to use. It should feel modern, polished, and professional.
*   **Rock-Solid Stability:** The application must be error-free and crash-free. Implement robust error handling and graceful degradation.
*   **Blazing Fast Performance:** The application should be highly performant, with fast page loads and smooth interactions. Leverage Next.js features like Server-Side Rendering (SSR) and Static Site Generation (SSG) where appropriate.
*   **Full Feature Parity:** The web front-end must implement all features available in the SystonApp ecosystem, providing a seamless experience with the backend and mobile app.
*   **Maintainable and Scalable Codebase:** The code should be clean, well-structured, and easy to maintain and extend.

## 3. Housekeeping: Code Consolidation

The repository currently contains two similar web application directories: `web` and `web-app`. The `web` directory is the primary, more complete application.

**Action:** Before starting development, delete the `web-app` directory to avoid confusion and ensure a single source of truth. All development should happen within the `web` directory.

## 4. Tech Stack

*   **Framework:** Next.js 14 (App Router)
*   **Language:** TypeScript
*   **UI Library:** Material-UI (MUI). Replace the existing basic CSS variable styling with MUI to create a professional and consistent look and feel.
*   **API Client:** The existing `@team-platform/sdk` should be used for all API communication.
*   **Styling:** Use MUI's styling solutions (e.g., `sx` prop, styled-components, or Emotion) for component-level styling.
*   **State Management:** For complex state management needs, use a library like Zustand or Recoil. For simpler cases, React Context is sufficient.
*   **Testing:** Use Vitest and Playwright for unit and end-to-end testing.

## 5. Design System and Theming

*   **Material Design:** The UI should adhere to Material Design principles.
*   **Dynamic Theming:** The application must support dynamic, multi-tenant theming. The branding information (colors, logos) will be fetched from the brand API. Use MUI's theming capabilities to dynamically adjust the theme based on the tenant.
*   **Dark Mode:** Implement a dark mode that can be toggled by the user.

## 6. Key Features to Implement

The web front-end must be fully wired up to the backend and implement the following features. Refer to the `API_CONTRACT.md` for detailed API specifications.

### 6.1. Tenant-Facing Application

This is the main application that club members will use.

*   **Home Page:** A dashboard that displays the latest fixture, a preview of the league table, and a news feed.
*   **Fixtures:** A page to view upcoming matches.
*   **Results:** A page to view past match results.
*   **League Table:** A page to display the league standings.
*   **Squad:** A page to view the team roster with player statistics.
*   **Stats:** A page for detailed team and player statistics.
*   **News Feed:** An independent news feed (not a social media copy).
*   **Calendar:** A custom-built calendar to display events, with RSVP functionality.
*   **Live Match Updates:** A feature to display live match updates (goals, cards, etc.).
*   **Gallery:** A photo and video gallery.
*   **Chat:** A real-time chat feature for team members.
*   **MOTM Voting:** A feature for players to vote for the Man of the Match.
*   **Training Tools:**
    *   Session Planner
    *   Drill Library
    *   Tactics Board
*   **Team Store:** Integration with Printify for the team store.

### 6.2. Admin Console

This is the application for club administrators.

*   **Multi-tenant Management:** A dashboard to manage all tenants.
*   **Feature Flags:** A UI to toggle features for different tenants.
*   **Analytics:** A dashboard to display key metrics.
*   **Onboarding Wizard:** A step-by-step wizard for onboarding new clubs.

## 7. Implementation Details

*   **Project Structure:** Organize the code in a logical and scalable way. Use the existing structure in the `web` directory as a starting point, but feel free to refactor for clarity and maintainability.
*   **Component Library:** Create a library of reusable components for common UI elements.
*   **Error Handling:** Implement comprehensive error handling, with user-friendly error messages and logging.
*   **Authentication:** Implement a secure authentication flow, using the existing JWT-based authentication.
*   **Responsive Design:** The application must be fully responsive and work flawlessly on desktop, tablet, and mobile devices.

## 8. Final Deliverable

The final deliverable is a pull request to the main branch with the new, world-class front-end. The pull request should include:

*   The complete Next.js application in the `web` directory.
*   All necessary documentation, including an updated `README.md` with detailed setup and development instructions.
*   A comprehensive suite of tests.

This is a high-level overview. You are expected to use your expertise to make design and implementation decisions that align with the goal of building a world-class application.