import { SECRET_OPENAI_KEY } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import OpenAI from 'openai';

const openai = new OpenAI({
	apiKey: SECRET_OPENAI_KEY
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		const req: {
			messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
		} = await request.json();

		const res = await openai.chat.completions.create({
			model: 'chatgpt-4o-latest',
			messages: req.messages
		});

		return json(res.choices[0].message, { status: 200 });
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'Unknown error occurred';
		throw error(500, message);
	}
};
