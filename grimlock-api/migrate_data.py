#!/usr/bin/env python3
"""Script to migrate JSONL build logs to PostgreSQL."""

import asyncio
import json
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from grimlock_api.models import Build, BuildLog
from grimlock_api.database import Base


async def migrate():
    """Run migration from JSONL to PostgreSQL."""
    # Connect to database
    engine = create_async_engine(
        "postgresql+asyncpg://grimlock:grimlock@localhost:5432/grimlock",
        echo=False,
    )
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    build_logs_dir = Path("/home/ubuntu/projects/grimlock/build-logs")
    index_path = build_logs_dir / "index.json"

    if not index_path.exists():
        print("No index.json found, skipping migration")
        return

    with open(index_path) as f:
        index = json.load(f)

    async with async_session() as db:
        for build_entry in index.get("builds", []):
            build_id = build_entry["id"]

            # Check if already migrated
            result = await db.execute(select(Build).where(Build.id == build_id))
            if result.scalar_one_or_none():
                print(f"  Skipping {build_id} (already exists)")
                continue

            # Parse timestamps (remove timezone for naive datetime)
            started_at = datetime.utcnow()
            if build_entry.get("startedAt"):
                dt = datetime.fromisoformat(build_entry["startedAt"].replace("Z", "+00:00"))
                started_at = dt.replace(tzinfo=None)

            stopped_at = None
            if build_entry.get("stoppedAt"):
                dt = datetime.fromisoformat(build_entry["stoppedAt"].replace("Z", "+00:00"))
                stopped_at = dt.replace(tzinfo=None)

            # Create build
            build = Build(
                id=build_id,
                name=build_entry.get("name", build_id),
                status=build_entry.get("status", "running"),
                phase=build_entry.get("phase", "prd_uploaded"),
                started_at=started_at,
                stopped_at=stopped_at,
                duration=build_entry.get("duration"),
            )
            db.add(build)
            print(f"  Migrated build: {build_id}")

            # Migrate logs
            logs_path = build_logs_dir / "builds" / f"{build_id}.jsonl"
            if logs_path.exists():
                log_count = 0
                with open(logs_path) as f:
                    for line in f:
                        if not line.strip():
                            continue
                        try:
                            log_entry = json.loads(line)
                            timestamp = datetime.utcnow()
                            if log_entry.get("ts"):
                                dt = datetime.fromisoformat(log_entry["ts"].replace("Z", "+00:00"))
                                timestamp = dt.replace(tzinfo=None)

                            log = BuildLog(
                                build_id=build_id,
                                timestamp=timestamp,
                                event=log_entry.get("event", "unknown"),
                                phase=log_entry.get("phase"),
                                message=log_entry.get("msg", ""),
                                level=log_entry.get("level", "info"),
                            )
                            db.add(log)
                            log_count += 1
                        except json.JSONDecodeError:
                            continue
                print(f"    Migrated {log_count} log entries")

        await db.commit()
        print("Migration complete!")


if __name__ == "__main__":
    asyncio.run(migrate())
