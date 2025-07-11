from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from .routers import shipments_router
from .config import settings
# from .services import database_service # For potential startup/shutdown events like DB connection pool

app = FastAPI(
    title="Shipping Service API",
    description="Manages shipment creation and tracking for notes.",
    version="0.1.0"
)

# Include routers
app.include_router(shipments_router.router)

# Example: Basic root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to the Shipping Service API!"}

# Example: Global exception handler (optional, FastAPI handles validation errors well by default)
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log the exception for debugging
    print(f"Unhandled exception: {exc} for request {request.url}") # Basic logging
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred on the server."}
    )

# Optional: Add startup/shutdown events if needed
# @app.on_event("startup")
# async def startup_event():
#     # e.g., initialize database connection pool if not using SQLAlchemy engine's implicit pooling
#     # await database_service.connect()
#     print("Shipping Service starting up...")

# @app.on_event("shutdown")
# async def shutdown_event():
#     # e.g., close database connection pool
#     # await database_service.disconnect()
#     print("Shipping Service shutting down...")

# To run this app (as per Dockerfile CMD):
# uvicorn app:app --host 0.0.0.0 --port 8000 --reload
# The settings.port is available if needed to be passed to uvicorn programmatically.
# However, uvicorn in Dockerfile uses port 8000 directly.
# The docker-compose maps host port 8001 to container port 8000.
# So, locally, this service will be accessible at http://localhost:8001
