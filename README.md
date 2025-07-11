# Project Title: Notes Application

A full-stack notes application using PostgreSQL, PostgREST, and React.

## Features

*   Create, view, update, and delete notes.
*   User authentication with JWT.
*   Create, view, update, and delete notes, with Row Level Security ensuring users can only access their own notes.
*   **NEW: Ship Notes**: Functionality to prepare notes for physical shipment and integrate with external shipping carriers (initially UPS).
*   RESTful API for note and user management (via PostgREST), plus a dedicated API for shipping operations.

## Technologies Used

*   **Backend:**
    *   PostgreSQL: Relational database for storing notes and shipment details.
    *   PostgREST: Serves a RESTful API directly from the PostgreSQL database for core note/user CRUD.
    *   **Shipping Service (FastAPI/Python)**: A new microservice to handle integration with external shipping APIs (e.g., UPS), including OAuth, label generation logic, and tracking.
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
    *   **Configure Environment Variables:** Before the first run, you **must** update `docker-compose.yml` with your actual UPS API credentials for the `shipping_service`:
        *   `UPS_CLIENT_ID`
        *   `UPS_CLIENT_SECRET`
        *   `UPS_SHIPPER_NUMBER`
        *   Optionally, update `UPS_API_BASE_URL` if you are not using the UPS sandbox (`https://wwwcie.ups.com/api`).
        *   The `JWT_SECRET` should also be a strong, unique secret if not already changed from the default.
    *   Run `docker-compose up -d --build` to build images (especially for the new `shipping_service`) and start all services: PostgreSQL database, PostgREST API, and the new Shipping Service.
        *   The database will be initialized/updated using scripts in the `init/` directory.
        *   The PostgREST API will be accessible at `http://localhost:3000`.
        *   The Shipping Service API will be accessible at `http://localhost:8001`.

3.  **Frontend Setup:**
    *   Navigate to the `frontend` directory: `cd frontend`.
    *   Install dependencies: `npm install`.
    *   Start the development server: `npm run dev`.
    *   The frontend application will be accessible at the URL provided by Vite (usually `http://localhost:5173`).

## Usage

*   Once all services are running (PostgreSQL, PostgREST, Shipping Service, and Frontend dev server), open your browser to the frontend URL.
*   Create an account / Log in.
*   Create a note. You can then edit the note to add shipping address details and mark it as "shippable".
*   If a note is shippable and has an address, a "Ship Note" form will appear, allowing you to (conceptually, once fully implemented) create a shipment via UPS.
*   Shipment status and tracking information can be viewed.

## API Endpoints

The application now uses two backend API services:

### 1. PostgREST API (Notes & Users)

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
    *   `GET /shipments?note_id=eq.{note_id}`: Retrieve shipments associated with a note (for the authenticated user).
*   **Users:**
    *   `GET /users`: Retrieve users (access might be restricted).

*(The `init/init.sql` file defines the tables `users`, `notes`, `shipments`, and the `login` function. RLS policies ensure users can only operate on their own data.)*

### 2. Shipping Service API (FastAPI)

This service handles interactions with external shipping carriers.

*   **Base URL:** `http://localhost:8001/api/v1`
*   **Authentication:** Expects a JWT (obtained from PostgREST login) in the `Authorization: Bearer <token>` header. (Note: JWT validation in this service is currently a TODO).

Key endpoints include:

*   `POST /shipments/`: Create a new shipment for a note.
    *   **Request Body:** `{ "note_id": "uuid", "carrier": "ups", "package_weight_kg": 0.1, ... }`
    *   **Response:** Shipment details including tracking number and status.
*   `GET /shipments/{shipment_id}/status`: Get the latest tracking status for a shipment.
*   `GET /shipments/{shipment_id}/label`: (TODO) Download the shipping label for a shipment.

## Key Implementation Details & TODOs

This project provides a foundational structure for a notes app with shipping integration. Several parts are placeholders or require further development for production use:

*   **UPS API Integration (`shipping_service/services/ups_service.py`):**
    *   The UPS client needs full implementation of OAuth 2.0 token management.
    *   Actual request/response structures for creating shipments and getting tracking details must be implemented based on the official UPS API documentation / Postman collection.
    *   The specific UPS API version for shipping (e.g., "v2205") needs to be confirmed and used.
    *   Requires valid UPS `client_id`, `client_secret`, and `shipper_number` to be configured.
*   **JWT Authentication in Shipping Service:** The FastAPI service currently uses a placeholder for user ID. It **must** be updated to validate the JWT passed from the frontend and extract the authenticated `user_id`.
*   **Label Download Endpoint:** The backend endpoint `GET /api/v1/shipments/{shipment_id}/label` needs to be implemented in the shipping service to serve label files.
*   **Royal Mail Integration:** Currently not implemented. Requires access to Royal Mail's shipment creation API documentation and subsequent implementation in the `shipping_service`.
*   **Error Handling:** While basic error handling is present, it can be made more robust and user-friendly across all services.
*   **Database Migrations:** For production, a proper database migration tool (like Alembic for SQLAlchemy, or other PostgreSQL migration tools) should be used instead of relying solely on `init.sql` for schema changes after initial setup.
*   **Frontend Polish:** The frontend provides basic functionality. Further UI/UX refinements, loading states, and comprehensive error feedback would improve the user experience.
*   **Testing:** More comprehensive unit, integration, and end-to-end tests are needed.

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
