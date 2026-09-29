from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings

client = AsyncIOMotorClient(settings.mongo_uri)
db = client[settings.mongo_db]

jobs_collection = db["jobs"]
applications_collection = db["applications"]
portals_collection = db["portals"]
profile_collection = db["profile"]


async def ensure_indexes() -> None:
    await jobs_collection.create_index("url", unique=True)
    await jobs_collection.create_index("status")
    await jobs_collection.create_index("scraped_at")
    await jobs_collection.create_index("match_score")
    await applications_collection.create_index("job_id", unique=True)
    await portals_collection.create_index("name", unique=True)
