from pydantic import BaseSettings, Field

class Settings(BaseSettings):
    database_url: str = Field(..., env="DATABASE_URL")
    jwt_secret: str = Field(..., env="JWT_SECRET")
    ups_client_id: str = Field(..., env="UPS_CLIENT_ID")
    ups_client_secret: str = Field(..., env="UPS_CLIENT_SECRET")
    ups_api_base_url: str = Field(..., env="UPS_API_BASE_URL")
    ups_shipper_number: str = Field(..., env="UPS_SHIPPER_NUMBER") # Added UPS Shipper Number
    port: int = Field(8000, env="PORT")

    class Config:
        env_file = ".env" # Optional: if you want to use a .env file locally
        env_file_encoding = "utf-8"

settings = Settings()
