from services.pdf_processing import generate_embeddings
from database.db import database

from core.openaiclient import client

MODEL = "gpt-4o-mini"

async def generate_response(query, relevant_chunks):

    system_prompt = "You are a helpful assistant that answers questions based on the provided document chunks. Use only the information in the chunks to answer the question. If the information is not available in the chunks, say you don't know."

    user_prompt = f"Question: {query}\n\nRelevant Document Chunks:\n" + "\n\n".join(relevant_chunks)

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        max_tokens=500,
        temperature=0.2
    )

    return response.choices[0].message.content.strip()


async def fetch_closest_chunks(query_embedding, user_id):
    async with database.pool.acquire() as connection:
        results = await connection.fetch(
            """
            SELECT chunk_text
            FROM document_chunks
            WHERE file_id IN (
                SELECT id FROM files WHERE user_id = $1
            )
            ORDER BY embedding <=> $2
            LIMIT 5
            """,
            user_id,
            query_embedding
        )

        return [row['chunk_text'] for row in results]

async def query_documents(query: str, user_id: int):

    query_embedding = (await generate_embeddings([query]))[0]

    results = await fetch_closest_chunks(
        query_embedding,
        user_id
    )

    answer = await generate_response(query, results)
    if not answer:
        answer = "Sorry, I couldn't find an answer to your question based on the uploaded documents."

    return answer