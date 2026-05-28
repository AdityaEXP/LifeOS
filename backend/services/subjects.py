from database.db import database

async def create_subject(user_id, name):
    async with database.pool.acquire() as connection:

        result = await connection.fetchrow(
            """
            INSERT INTO subjects (user_id, name)
            VALUES ($1, $2)
            RETURNING id
            """,
            user_id,
            name
        )

        return result["id"]

async def get_all_subjects_for_user(user_id):
    async with database.pool.acquire() as connection:

        results = await connection.fetch(
            """
            SELECT
                s.id AS subject_id,
                s.name,
                s.created_at,
                f.id AS file_id,
                f.original_filename,
                f.stored_filename,
                f.status,
                f.upload_time
            FROM subjects s
            LEFT JOIN subject_files sf ON sf.subject_id = s.id
            LEFT JOIN files f ON f.id = sf.file_id
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC, f.upload_time DESC NULLS LAST
            """,
            user_id
        )

        subjects = {}

        for row in results:
            subject_id = row["subject_id"]

            if subject_id not in subjects:
                subjects[subject_id] = {
                    "id": subject_id,
                    "name": row["name"],
                    "created_at": row["created_at"],
                    "files": []
                }

            if row["file_id"] is not None:
                subjects[subject_id]["files"].append({
                    "id": row["file_id"],
                    "original_filename": row["original_filename"],
                    "stored_filename": row["stored_filename"],
                    "status": row["status"],
                    "upload_time": row["upload_time"]
                })

        return list(subjects.values())
    
async def assign_file_to_subject(user_id, subject_id, file_id):

    async with database.pool.acquire() as connection:

        subject = await connection.fetchrow(
            """
            SELECT id
            FROM subjects
            WHERE id = $1 AND user_id = $2
            """,
            subject_id,
            user_id
        )

        if not subject:
            raise ValueError("Subject does not belong to user")

        file_row = await connection.fetchrow(
            """
            SELECT id
            FROM files
            WHERE id = $1 AND user_id = $2
            """,
            file_id,
            user_id
        )

        if not file_row:
            raise ValueError("File does not belong to user")

        await connection.execute(
            """
            INSERT INTO subject_files (subject_id, file_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            """,
            subject_id,
            file_id
        )

async def delete_subject(user_id, subject_id):

    async with database.pool.acquire() as connection:

        subject = await connection.fetchrow(
            """
            SELECT id
            FROM subjects
            WHERE id = $1 AND user_id = $2
            """,
            subject_id,
            user_id
        )

        if not subject:
            raise ValueError("Subject does not belong to user")

        await connection.execute(
            """
            DELETE FROM subjects
            WHERE id = $1
            """,
            subject_id
        )

async def remove_file_from_subject(user_id, subject_id, file_id):

    async with database.pool.acquire() as connection:

        subject = await connection.fetchrow(
            """
            SELECT id
            FROM subjects
            WHERE id = $1 AND user_id = $2
            """,
            subject_id,
            user_id
        )

        if not subject:
            raise ValueError("Subject does not belong to user")

        await connection.execute(
            """
            DELETE FROM subject_files
            WHERE subject_id = $1 AND file_id = $2
            """,
            subject_id,
            file_id
        )