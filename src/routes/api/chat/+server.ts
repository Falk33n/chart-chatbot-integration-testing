import { SECRET_OPENAI_KEY } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';

const openai = new OpenAI({
	apiKey: SECRET_OPENAI_KEY
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		const req = await request.json();

		if (req.messages) {
			const response = await openai.chat.completions.create({
				model: 'chatgpt-4o-latest',
				messages: req.messages
			});

			/* 			(async () => {
				const URI = SECRET_NEO4J_URI;
				const USER = SECRET_NEO4J_NAME;
				const PASSWORD = SECRET_NEO4J_PSW;
				let driver, session;

				try {
					driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
					const serverInfo = await driver.getServerInfo();
					console.log('Connection established');
					console.log(serverInfo);
				} catch (err) {
					console.log(`Connection error\n${err}\nCause: ${err}`);
					return;
				}

				session = driver.session({
					database: 'neo4j'
				});
			})(); */

			return json(response.choices[0].message, { status: 200 });
		}

		const res = await openai.embeddings.create({
			model: 'text-embedding-3-small',
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
