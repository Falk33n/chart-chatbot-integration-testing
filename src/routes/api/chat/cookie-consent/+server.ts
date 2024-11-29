import { NODE_ENV } from '$env/static/private';
import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

// Schema for creating a cookie consent
const CREATE_COOKIE_CONSENT_SCHEMA = z.object({
	hasAccepted: z.boolean().default(false)
});

type CreateCookieConsent = z.infer<typeof CREATE_COOKIE_CONSENT_SCHEMA>;

// Endpoint for creating a cookie consent
export const POST: RequestHandler = async ({ request, cookies }) => {
	const input: CreateCookieConsent = await request.json();
	const result = CREATE_COOKIE_CONSENT_SCHEMA.safeParse(input);

	if (!result.success) {
		return json({ error: result.error.message }, { status: 400 });
	}

	const { hasAccepted } = result.data;

	cookies.set('cc', hasAccepted.toString(), {
		httpOnly: true,
		secure: NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: 24 * 60 * 60 * 365, // 1 year
		path: '/'
	});

	return json({ message: 'Skapade en ny samtyckes cookie.' }, { status: 201 }); // Code 201 = Created
};
