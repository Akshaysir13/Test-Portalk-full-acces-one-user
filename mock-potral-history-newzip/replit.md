# JEE B.Arch Mock Test Portal

## Overview
A comprehensive mock test platform designed for JEE B.Arch exam preparation. The portal provides timed practice tests with advanced security features including violation tracking, fullscreen enforcement, anti-cheating measures, and mobile device blocking. The system supports both admin and student roles with an approval workflow for new student registrations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.2 for fast development and optimized production builds
- **Styling**: Tailwind CSS 3.4.1 for utility-first styling
- **Routing**: React Router v7 with 6 main routes: `/login`, `/signup`, `/test`, `/admin`, `/analytics`, `/leaderboard`
- **State Management**: React Context API with two primary contexts:
  - `AuthContext`: Handles authentication, user sessions, and role-based access
  - `TestContext`: Manages test state, questions, answers, timing, and violations
- **Icons**: Lucide React for consistent iconography

### Backend Architecture
- **Server**: Express.js running on port 3001
- **API Pattern**: RESTful endpoints under `/api` prefix
- **Proxy Configuration**: Vite dev server proxies `/api` requests to the backend

### Data Storage
- **Primary Database**: Replit PostgreSQL (connected via DATABASE_URL)
- **Connection**: Uses `pg` package with connection pooling
- **Local Storage**: Used for device tokens, saved test states, and session persistence
- **Key Storage Patterns**:
  - `device_token`: Unique device identifier for session tracking
  - `jee_mock_test_saved_state`: Auto-saved test progress (every 5 seconds)
  - `current_user`: Cached user session data
- **Database Tables**:
  - `users`: Stores user accounts with email, password, role, and approval status
  - `user_sessions`: Tracks active sessions with device tokens for single-device enforcement
  - `session_violations`: Logs multiple device login attempts for admin review
  - `test_attempts`: Persists test history with scores, violations, and timestamps

### Authentication & Authorization
- **Roles**: Admin and Student with distinct capabilities
- **Student Approval Workflow**: New signups require admin approval before access
- **Session Management**: Device token-based session tracking to prevent multi-device logins
- **Single Device Enforcement**: Only one active session per student; new logins invalidate old sessions
- **Violation Tracking**: Records session violations for security monitoring

### Security Notes
- **IMPORTANT**: Passwords are currently stored in plaintext. For production use, implement bcrypt hashing before deployment.

### Security Features
- **Mobile Blocking**: Prevents access from mobile devices (enforces desktop-only usage)
- **Fullscreen Enforcement**: Tests require fullscreen mode with violation tracking on exit
- **Screenshot Prevention**: Black overlay blocks content when fullscreen is exited
- **Tab Switch Detection**: Tracks and records when users switch browser tabs
- **Anti-Cheating**: Prevents copy, paste, right-click, and keyboard shortcuts during tests

### Test Management
- **Question Types**: Normal, match-pair, and statement-based questions
- **Answer Shuffling**: Options are randomized per attempt
- **State Persistence**: Test progress auto-saves and can be resumed after interruptions
- **Scoring**: Supports positive marking with correct answer tracking
- **Categories**: Tests organized by type (white, blue, grey, pyq, latest)

## External Dependencies

### Database
- **Replit PostgreSQL**: Built-in database service
  - Environment variables: `DATABASE_URL`
  - Tables: users, user_sessions, session_violations, test_attempts

### Production Deployment
- **Vercel**: Configured for deployment with `vercel.json`
- **Build Output**: Vite produces optimized static assets in `dist/` folder

### Development Tools
- **Concurrently**: Runs backend server and Vite dev server simultaneously
- **CORS**: Enabled for cross-origin API requests during development

### Server Configuration
- **Development Port**: 5000 (Vite) with API proxy to 3001 (Express)
- **Host Binding**: `0.0.0.0` for Replit compatibility
- **Preview Mode**: Same configuration for production preview testing