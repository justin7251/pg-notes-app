import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from uuid import UUID

from ..config import settings
from ..models.shipment_models import ShipmentCreationRequest # For package details

# --- UPS API Client ---
# This is a simplified client. A real implementation would handle:
# - OAuth token storage and refresh more robustly (e.g., in DB or Redis)
# - Detailed error handling and mapping UPS error codes
# - Full request/response models for UPS APIs

# Global cache for OAuth token (simple in-memory, not for production clusters)
_ups_oauth_token: str | None = None
_ups_token_expiry: float = 0 # Timestamp when token expires

class UPSApiClient:
    def __init__(self):
        self.client_id = settings.ups_client_id
        self.client_secret = settings.ups_client_secret
        # UPS API version for shipping - this needs to be confirmed from Postman or UPS docs
        # e.g., "v1", "v1607", "v2205" etc. The user-provided info said "vX.Y"
        self.shipping_api_version = "v1" # Placeholder, VERIFY THIS!
        self.base_url = settings.ups_api_base_url.rstrip('/')
        self.token_url = f"{self.base_url}/security/v1/oauth/token" # Path from user's info, assuming base_url is just domain
        # The user provided /oauth/v1/token - often this is on a different base auth URL.
        # For now, assume it's relative to ups_api_base_url or a known fixed UPS auth URL.
        # Let's assume a common pattern for enterprise APIs:
        # self.auth_base_url = "https://wwwcie.ups.com/security/v1/oauth" # Or similar
        # self.token_url = f"{self.auth_base_url}/token"
        # The user's link https://www.postman.com/ups-api/ups-apis/overview might clarify base URLs.
        # For now, using the provided /oauth/v1/token and assuming it's on the same base_url for simplicity.
        # The Postman collection is the best source for exact URLs.

    async def _get_oauth_token(self) -> str | None:
        global _ups_oauth_token # , _ups_token_expiry
        # In a real app, use a proper cache or manage token expiry
        # if _ups_oauth_token and time.time() < _ups_token_expiry:
        # return _ups_oauth_token

        auth_data = {
            "grant_type": "client_credentials"
        }
        # UPS typically requires client_id:client_secret to be Base64 encoded in Authorization header
        # For client_credentials, some APIs take client_id/secret in body.
        # The Postman collection will show the exact mechanism.
        # Assuming Basic Auth for token endpoint for now, as per common OAuth client_credentials.
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            # "Authorization": "Basic <base64_encoded_client_id:client_secret>"
            # This needs to be confirmed. The Postman collection is key here.
        }

        # This is a common way, but UPS might differ.
        # For now, let's assume client_id and client_secret are sent in the body or as basic auth.
        # The Postman collection is CRITICAL here. The user-provided info said:
        # "Obtain tokens via the /oauth/v1/token endpoint"
        # "global variables like client_id, client_secret"
        # This implies they might be part of the request body or headers for the token call.

        # Simplistic placeholder for token fetching:
        # A real call would look like:
        # async with httpx.AsyncClient() as client:
        #     response = await client.post(self.token_url, data=auth_data, auth=(self.client_id, self.client_secret))
        #     response.raise_for_status()
        #     token_data = response.json()
        #     _ups_oauth_token = token_data["access_token"]
        #     # _ups_token_expiry = time.time() + token_data.get("expires_in", 3600) - 60 # 60s buffer
        #     return _ups_oauth_token
        print(f"Attempting to get OAuth token from {self.token_url} (THIS IS A PLACEHOLDER)")
        print(f"Using Client ID: {self.client_id[:4]}... Secret: {self.client_secret[:4]}...")
        # Simulate returning a dummy token for now for flow control
        _ups_oauth_token = "dummy-ups-oauth-token-for-dev"
        return _ups_oauth_token


    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def create_shipment(
        self,
        note_id: UUID, # For logging/reference
        recipient_details: dict, # From notes table
        package_details: ShipmentCreationRequest # Contains weight/dimensions
    ) -> dict | None:
        """
        Creates a shipment with UPS.
        Returns a dictionary with carrier_shipment_id, tracking_number, label_image_url/label_data.
        """
        token = await self._get_oauth_token()
        if not token:
            print("Failed to get UPS OAuth token.")
            return None

        # Construct UPS Shipment Request Payload
        # This is highly dependent on the UPS API specific structure.
        # It needs: Shipper info (from config or user profile), ShipTo info (recipient_details),
        # Service type, Package details (weight, dimensions from package_details), Label spec.
        # Example structure (VERY SIMPLIFIED - GET ACTUAL FROM POSTMAN/UPS DOCS):
        payload = {
            "ShipmentRequest": {
                "Request": {
                    "RequestOption": "nonvalidate", # Or "validate"
                    "TransactionReference": {
                        "CustomerContext": str(note_id)
                    }
                },
                "Shipment": {
                    "Shipper": { # This should come from app config or user's profile
                        "Name": "My Notes App Shipper",
                        "AttentionName": "Shipping Dept",
                        "ShipperNumber": settings.ups_shipper_number, # REQUIRES a shipper number in settings
                        "Phone": {"Number": "1234567890"},
                        "Address": {
                            "AddressLine": ["123 Main St"],
                            "City": "Anytown",
                            "StateProvinceCode": "GA",
                            "PostalCode": "30303",
                            "CountryCode": "US"
                        }
                    },
                    "ShipTo": {
                        "Name": recipient_details.get("recipient_name"),
                        "AttentionName": recipient_details.get("recipient_name"),
                        "Phone": {"Number": "0000000000"}, # Placeholder
                        "Address": {
                            "AddressLine": [
                                recipient_details.get("recipient_address_line1"),
                                recipient_details.get("recipient_address_line2")
                            ],
                            "City": recipient_details.get("recipient_city"),
                            "PostalCode": recipient_details.get("recipient_postal_code"),
                            "CountryCode": recipient_details.get("recipient_country") # Needs to be 2-letter ISO
                        }
                    },
                    "PaymentInformation": { # Assuming shipper pays
                        "ShipmentCharge": {
                            "Type": "01", # Bill Shipper
                            "BillShipper": {"AccountNumber": settings.ups_shipper_number}
                        }
                    },
                    "Service": {"Code": "03"}, # Example: UPS Ground. Codes vary.
                    "Package": [{
                        "Packaging": {"Code": "02"}, # 02 for customer supplied package
                        "Dimensions": {
                            "UnitOfMeasurement": {"Code": "CM"},
                            "Length": str(package_details.package_length_cm),
                            "Width": str(package_details.package_width_cm),
                            "Height": str(package_details.package_height_cm)
                        },
                        "PackageWeight": {
                            "UnitOfMeasurement": {"Code": "KGS"}, # Or LBS
                            "Weight": str(package_details.package_weight_kg)
                        }
                    }],
                    "LabelSpecification": {
                        "LabelImageFormat": {"Code": "GIF"}, # Or ZPL, EPL, SPL, PDF
                        # "LabelStockSize": { "Height": "4", "Width": "6" } # For thermal printers
                    }
                }
            }
        }
        # The actual endpoint is /shipments, not /ship/vX.Y/shipment as per some generic examples
        # User info: "POST /ship/vX.Y/shipment" - this needs to be confirmed from Postman.
        # The Postman collection will be the source of truth for the path.
        # Assuming "/api/shipments/v1/ship" or similar based on common patterns.
        # For now, using the user-provided structure:
        ship_url = f"{self.base_url}/ship/{self.shipping_api_version}/shipments" # VERIFY THIS PATH

        print(f"Calling UPS Ship API (PLACEHOLDER) at {ship_url} for note {note_id}")
        # async with httpx.AsyncClient() as client:
        #     headers = {
        #         "Authorization": f"Bearer {token}",
        #         "Content-Type": "application/json",
        #         "transId": str(uuid.uuid4()), # Example transaction ID
        #         "transactionSrc": "testing" # Example source
        #     }
        #     response = await client.post(ship_url, json=payload, headers=headers)
        #     response.raise_for_status() # Will raise exception for 4xx/5xx
        #     shipment_results = response.json()["ShipmentResponse"]["ShipmentResults"]
        #     label_image = shipment_results["PackageResults"][0]["ShippingLabel"]["GraphicImage"] # Base64
        #     tracking_no = shipment_results["PackageResults"][0]["TrackingNumber"]
        #     carrier_id = shipment_results.get("ShipmentIdentificationNumber", tracking_no)

        #     return {
        #         "carrier_shipment_id": carrier_id,
        #         "tracking_number": tracking_no,
        #         "label_data": label_image, # Base64 encoded image
        #         "label_image_url": None # UPS usually provides data, not a direct URL to image
        #     }

        # Simulate successful response for dev
        return {
            "carrier_shipment_id": f"ups-carrier-id-{UUID(int=0).hex[:6]}",
            "tracking_number": f"1Z{UUID(int=1).hex.upper()[:16]}",
            "label_data": "dummy-base64-encoded-gif-label-data", # Simulate base64 data
            "label_image_url": None, # Typically label data is returned, not a URL
            "status": "created" # Or "SUBMITTED", "PROCESSING"
        }

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def get_tracking_status(self, tracking_number: str) -> dict | None:
        """
        Gets tracking status from UPS.
        Returns a dictionary with status and last_known_event.
        """
        token = await self._get_oauth_token()
        if not token:
            return None

        # User info: GET /track/v1/details/{inquiryNumber}
        # The Postman collection will be the source of truth for the path.
        track_url = f"{self.base_url}/track/v1/details/{tracking_number}" # VERIFY THIS PATH
        # Or something like: f"{self.base_url}/track/v1/trackingnumbers/{tracking_number}"
        # Or different base URL for tracking API.

        print(f"Calling UPS Track API (PLACEHOLDER) at {track_url} for {tracking_number}")
        # async with httpx.AsyncClient() as client:
        #     headers = {
        #         "Authorization": f"Bearer {token}",
        #         "Content-Type": "application/json",
        #         "transId": str(uuid.uuid4()),
        #         "transactionSrc": "testing"
        #     }
        #     # May need params like inquiryNumber=tracking_number or locale
        #     response = await client.get(track_url, headers=headers)
        #     response.raise_for_status()
        #     track_data = response.json()
        #     # Parse track_data to extract relevant status and event
        #     # Simplified example:
        #     status_description = track_data.get("shipment", [{}])[0].get("package", [{}])[0].get("activity", [{}])[0].get("status", {}).get("description", "Status Unknown")
        #     return {
        #         "status": status_description,
        #         "last_known_event": status_description # Or more detailed event
        #     }

        # Simulate response
        return {
            "status": "In Transit - On Time",
            "last_known_event": "Departed from Facility - Anytown, US"
        }

# Need to add UPS Shipper Number to config.py and docker-compose.yml
# Example: settings.ups_shipper_number
# This is crucial for billing.
# For now, it's hardcoded in the Shipper block, but should be from config.
# I'll add a note to update config.py for this.
# Also, the exact structure of the UPS API URLs and request/response bodies
# are placeholders and MUST BE VERIFIED with the Postman collection or official UPS JSON API docs.
# The current code is a structural skeleton.
# Critical: The user-provided info "POST /ship/vX.Y/shipment" and "GET /track/v1/details/{inquiryNumber}"
# needs to be mapped to the actual full URLs based on the UPS API base URL and specific API product paths.
# The Postman collection is the best source for this.
# For example, the Shipping API might be at something like:
# https://wwwcie.ups.com/api/shipments/v1/ship  (if base_url is https://wwwcie.ups.com/api)
# or https://onlinetools.ups.com/ship/v1/shipments (older SOAP based patterns sometimes carry over)
# The user provided "UPS_API_BASE_URL: "https://wwwcie.ups.com/api"" in docker-compose.
# So paths like "/ship/v1/shipments" or "/track/v1/details/{inquiryNumber}" would be appended to that.
# The token URL "/security/v1/oauth/token" might be an absolute path or also relative to this base.
# The Postman collection will clarify this.
# I have used the base_url + user-provided paths for now.
#
# One more thing: The `ups_shipper_number` is required. I should add it to the Settings.
# I will make a follow-up to add `ups_shipper_number` to `config.py`.
# And remind the user to set it in `docker-compose.yml` or `.env`.
#
# The OAuth token URL also needs verification. "/security/v1/oauth/token" is a common path, but might be on a different subdomain.
# E.g. `https://auth.ups.com/security/v1/oauth/token`
# The Postman collection is key.
#
# Final check on user input:
# Shipping API (POST /ship/vX.Y/shipment)
# Tracking API (GET /track/v1/details/{inquiryNumber})
# Auth: /oauth/v1/token
# These paths will be appended to settings.ups_api_base_url.
#
# The version "vX.Y" for shipping is still a placeholder "v1" in my code. This needs to be found from Postman.
# If the Postman collection is `https://www.postman.com/ups-api/ups-apis/overview`, it should specify versions.
#
# The structure of the JSON payload for shipping is *very* complex for UPS. The one I have is a common pattern
# but will need significant adjustment to match UPS's exact schema (elements, casing, specific codes for services, packages etc.)
# The Postman collection will have examples of these request bodies.
#
# For now, this provides the service structure and placeholder logic.
# The next step will be the FastAPI app and router.
# After that, I'll make a note to add `ups_shipper_number` to the config.
#
# Also, the `label_image_url` vs `label_data` in `database_service.py` for `shipments_table`
# and `update_shipment_in_db`: UPS usually provides label data (e.g. base64 GIF/ZPL/PDF).
# So, `label_data` is more likely to be populated from UPS.
# `label_image_url` would be if they host the image and give a URL, less common for raw labels.
# My `create_shipment` mock returns `label_data`.
# The DB update function `update_shipment_in_db` correctly handles both.
# The `ShipmentResponse` model from `shipment_models.py` only includes `label_image_url`. This might need adjustment
# if we want to pass raw label data to the frontend (less common, usually frontend gets a URL or triggers a download
# that the backend facilitates by converting label_data to a file response).
# For now, if label_data is stored, the frontend might need a new endpoint like `/shipments/{id}/label` to download it.
# I'll keep `ShipmentResponse` as is for now, assuming `label_image_url` would be preferred if ever available,
# or the backend handles the label_data-to-downloadable-file conversion via a separate endpoint.
# My mock in `create_shipment` populates `label_data` and sets `label_image_url` to `None`.
# The `update_shipment_in_db` call in the router will need to map these correctly.
#
# I should also add `ups_shipper_number: str = Field(..., env="UPS_SHIPPER_NUMBER")` to `config.py`.
# And add `UPS_SHIPPER_NUMBER: "YOUR_UPS_SHIPPER_ACCOUNT_NUMBER"` to `docker-compose.yml`.
# This is essential. I'll do this after creating the router and app.py.Okay, the skeleton for `ups_service.py` is created. It includes placeholder logic for OAuth and API calls, highlighting areas that need verification against the UPS Postman collection (actual API paths, request/response structures, OAuth mechanism, API version for shipping). It also notes the critical need for a `UPS_SHIPPER_NUMBER`.

Next, I'll create the main FastAPI application file `shipping_service/app.py` and the router `shipping_service/routers/shipments_router.py`.

First, `shipping_service/routers/shipments_router.py`:
