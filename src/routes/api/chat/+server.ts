import {
	SECRET_NEO4J_NAME,
	SECRET_NEO4J_PSW,
	SECRET_NEO4J_URI,
	SECRET_OPENAI_KEY
} from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import neo4j from 'neo4j-driver';
import OpenAI from 'openai';
const openai = new OpenAI({
	apiKey: SECRET_OPENAI_KEY
});

type EmbeddingWithMetadata = {
	embeddings: number[];
	metadata: {
		page: number;
		startCharIndex: number;
		endCharIndex: number;
		charCount: number;
		filename: string;
	};
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const req = await request.json();

		if (req.messages) {
			const response = await openai.chat.completions.create({
				model: 'chatgpt-4o-latest',
				messages: req.messages
			});

			return json(response.choices[0].message, { status: 200 });
		}

		if (req.queryNeo4j) {
			async function getChunksByFileName(fileName: string) {
				const driver = neo4j.driver(
					SECRET_NEO4J_URI,
					neo4j.auth.basic(SECRET_NEO4J_NAME, SECRET_NEO4J_PSW)
				);
				const session = driver.session();

				try {
					const result = await session.run(
						`
            MATCH (f:File {fileName: $fileName})-[:HAS_CHUNK]->(c:Chunk)
            RETURN c.page AS page,
                   c.startWordIndex AS startWordIndex,
                   c.endWordIndex AS endWordIndex,
                   c.wordCount AS wordCount,
                   c.embeddings AS embeddings,
                   c.content AS content
            ORDER BY c.page
            `,
						{ fileName }
					);

					const chunks = result.records.map((record) => ({
						page: record.get('page'),
						startWordIndex: record.get('startWordIndex'),
						endWordIndex: record.get('endWordIndex'),
						wordCount: record.get('wordCount'),
						embeddings: record.get('embeddings'),
						content: record.get('content')
					}));

					return chunks;
				} catch (error) {
					console.error('Error retrieving chunks:', error);
					throw error;
				} finally {
					await session.close();
				}
			}

			const data = await getChunksByFileName(req.queryNeo4j);
			return json({ message: 'Query to Neo4j', data }, { status: 200 });
		}

		if (req.saveNeo4j) {
			async function saveToNeo4j(results: EmbeddingWithMetadata[]) {
				const driver = neo4j.driver(
					SECRET_NEO4J_URI,
					neo4j.auth.basic(SECRET_NEO4J_NAME, SECRET_NEO4J_PSW)
				);
				const session = driver.session();

				try {
					const tx = session.beginTransaction();

					for (const result of results) {
						const { embeddings, metadata } = result;

						await tx.run(
							`
              MERGE (f:File {fileName: $fileName})
              CREATE (c:Chunk {
                page: $page,
                startWordIndex: $startCharIndex,
                endWordIndex: $endCharIndex,
                wordCount: $charCount,
                embeddings: $embeddings
              })
              MERGE (f)-[:HAS_CHUNK]->(c)
              `,
							{
								page: metadata.page,
								startCharIndex: metadata.startCharIndex,
								endCharIndex: metadata.endCharIndex,
								charCount: metadata.charCount,
								embeddings,
								fileName: metadata.filename
							}
						);
					}

					await tx.commit();
					console.log('All chunks saved successfully to Neo4j.');
				} catch (error) {
					console.error('Error saving to Neo4j:', error);
				} finally {
					await session.close();
				}
			}

			await saveToNeo4j(req.neo4j);
			return json({ message: 'Saved to Neo4j' }, { status: 200 });
		}

		const res = await openai.embeddings.create({
			model: 'text-embedding-ada-002',
			input: req.input,
			encoding_format: 'float'
		});

		return json(res.data[0].embedding, { status: 200 });
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'Unknown error occurred';
		throw error(500, message);
	}
};
