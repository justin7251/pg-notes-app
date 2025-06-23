# Project Title: Notes Application

A full-stack notes application using PostgreSQL, PostgREST, and React.

## Features

*   Create, view, update, and delete notes.
*   User authentication with JWT.
*   Create, view, update, and delete notes, with Row Level Security ensuring users can only access their own notes.
*   RESTful API for note and user management.

## Technologies Used

*   **Backend:**
    *   PostgreSQL: Relational database for storing notes.
    *   PostgREST: Serves a RESTful API directly from the PostgreSQL database.
*   **Frontend:**
    *   React: JavaScript library for building user interfaces.
    *   Vite: Frontend build tool.
    *   Tailwind CSS: Utility-first CSS framework.
*   **Containerization:**
    *   Docker: To containerize and manage the application services.
    *   Docker Compose: For defining and running multi-container Docker applications.

## Setup and Installation

1.  **Prerequisites:**
    *   Git installed (for cloning the repository).
    *   Docker and Docker Compose installed.
    *   Node.js and npm (or yarn) installed for frontend development.

2.  **Backend Setup:**
    *   Clone the repository.
    *   Navigate to the project root directory.
    *   Run `docker-compose up -d` to start the PostgreSQL database and PostgREST API.
        *   The database will be initialized using scripts in the `init/` directory.
        *   The API will be accessible at `http://localhost:3000`.

3.  **Frontend Setup:**
    *   Navigate to the `frontend` directory: `cd frontend`.
    *   Install dependencies: `npm install`.
    *   Start the development server: `npm run dev`.
    *   The frontend application will be accessible at the URL provided by Vite (usually `http://localhost:5173`).

## Usage

*   Once both backend and frontend are running, open your browser to the frontend URL.
*   You should be able to interact with the notes application (further details would depend on the specific UI and features implemented).

## API Endpoints

The PostgREST API auto-generates endpoints based on your database schema.

*   **Base URL:** `http://localhost:3000/`
*   **OpenAPI Documentation:** PostgREST provides OpenAPI documentation. Access it via the root URL (`http://localhost:3000/`) once the service is running. The `PGRST_OPENAPI_SERVER_PROXY_URI` is set to this address.

Key endpoints include:

*   **Authentication:**
    *   `POST /rpc/login`: Authenticates a user and returns a JWT. Expects `email` and `password` in the request body.
*   **Notes (requires JWT in Authorization header: `Bearer <token>`):**
    *   `GET /notes`: Retrieve all notes for the authenticated user.
    *   `GET /notes?id=eq.{note_id}`: Retrieve a specific note by its ID.
    *   `POST /notes`: Create a new note. Body should include `title` and `content`. `user_id` is handled by RLS.
    *   `PATCH /notes?id=eq.{note_id}`: Update an existing note.
    *   `DELETE /notes?id=eq.{note_id}`: Delete a specific note.
*   **Users:**
    *   `GET /users`: Retrieve users (access might be restricted depending on RLS policies, if any are added for `users` table beyond default select for `web_anon`).
    *   *(Note: User creation/signup would typically be handled by a separate function or application logic, not direct POST to `/users` with password hashing.)*

*(The `init/init.sql` file defines the tables `users` and `notes`, and the `login` function. RLS policies ensure users can only operate on their own notes.)*

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

Please ensure your code adheres to any existing coding standards and include tests where appropriate.

## License

This project is currently unlicensed. Consider adding an open-source license like MIT or Apache 2.0 if you intend for others to use, modify, or distribute the code.

---

*This README was generated based on an initial analysis of the project structure. Further details and specific instructions may need to be added as the project evolves.*
