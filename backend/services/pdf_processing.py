import fitz
from langchain_text_splitters import RecursiveCharacterTextSplitter
from database import db
from core.openaiclient import client


EMBEDDING_MODEL = "text-embedding-3-small"

def extract_pdf_text(file_path):

    pages = []

    with fitz.open(file_path) as file:

        for page_num, page in enumerate(file, start=1):

            pages.append({
                "page": page_num,
                "text": page.get_text()
            })

    return pages

def chunk_document(pages):

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = []

    for page in pages:

        split_chunks = text_splitter.split_text(page["text"])

        for chunk in split_chunks:

            chunks.append({
                "text": chunk,
                "page": page["page"]
            })

    return chunks

async def generate_embeddings(chunks: list[str]):

    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=chunks
    )

    return [item.embedding for item in response.data]

# ------------------------------------------------------ above code is for processing the pdf and generating embeddings ------------------------------------------------------

async def store_file_metadata(user_id, original_filename, stored_filename, status="processing"):

    async with db.database.pool.acquire() as connection:

        result = await connection.fetchrow(
            """
            INSERT INTO files (user_id, original_filename, stored_filename, status)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            """,
            user_id,
            original_filename,
            stored_filename,
            status
        )

        return result["id"]
    
async def update_file_status(file_id, status):

    async with db.database.pool.acquire() as connection:

        await connection.execute(
            """
            UPDATE files
            SET status = $1
            WHERE id = $2
            """,
            status,
            file_id
        )

async def store_document_chunks(meta_chunks, document_id):

    embeddings = await generate_embeddings([chunk["text"] for chunk in meta_chunks])
    if embeddings is not None:
        async with db.database.pool.acquire() as connection:

            async with connection.transaction():
                for i, (chunk, embed) in enumerate(
                    zip(meta_chunks, embeddings)
                ):
                    await connection.execute(
                        """
                        INSERT INTO document_chunks
                        (file_id, chunk_text, embedding, chunk_index, page_number)
                        VALUES ($1, $2, $3, $4, $5)
                        """,
                        document_id,
                        chunk["text"],
                        embed,
                        i,
                        chunk["page"]
                    )

async def process_pdf_pipeline(file_path, user_id, original_filename, stored_filename):
    
    document_id = await store_file_metadata(
        user_id,
        original_filename,
        stored_filename
    )

    await update_file_status(document_id, "processing")


    try:
        pages = extract_pdf_text(file_path)
        meta_chunks = chunk_document(pages)
        await store_document_chunks(meta_chunks, document_id)
        await update_file_status(document_id, "completed")
    except Exception as e:
        await update_file_status(document_id, "error")
        raise 

async def get_all_files_for_user(user_id):

    async with db.database.pool.acquire() as connection:

        rows = await connection.fetch(
            """
            SELECT id, original_filename, stored_filename, status, upload_time
            FROM files
            WHERE user_id = $1
            ORDER BY upload_time DESC
            """,
            user_id
        )

        return [
            {
                "id": row["id"],
                "original_filename": row["original_filename"],
                "stored_filename": row["stored_filename"],
                "status": row["status"],
                "upload_time": row["upload_time"]
            }
            for row in rows
        ]