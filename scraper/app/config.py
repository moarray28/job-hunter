from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    # Shared secret the Next.js app sends in X-Service-Token. Empty = no check (local dev only).
    service_token: str = ""
    serpapi_key: str = ""
    scrape_user_agent: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )


settings = Settings()
