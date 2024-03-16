export interface Env {}

const frontendUrl = 'https://cross-origin-cookie-test.alukach.com';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const headers = {
			'Access-Control-Allow-Origin': frontendUrl, // NOTE: This cannot be a wildcard
			'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, credentials',
			'Access-Control-Allow-Credentials': 'true',
		};

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					...headers,
					Vary: 'Origin',
				},
			});
		}

		// Extract cookies from request
		const cookieHeader = request.headers.get('Cookie') || '';
		const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, current) => {
			const [name, value] = current.trim().split('=');
			acc[name] = value;
			return acc;
		}, {});

		// Handle POST requests
		if (request.method === 'POST') {
			const body = { message: 'Hello from the API' };
			return new Response(JSON.stringify(body), {
				headers: {
					...headers,
					'Content-Type': 'application/json',
					'Set-Cookie': `api_token=${Math.floor(Date.now() / 1000)}; SameSite=None; Secure; Path=/`,
				},
			});
		}

		// Handle DELETE requests
		if (request.method === 'DELETE') {
			const body = { message: 'Deleted the cookie' };
			return new Response(JSON.stringify(body), {
				headers: {
					...headers,
					'Content-Type': 'application/json',
					'Set-Cookie': `api_token=; SameSite=None; Secure; Path=/; Expires=${new Date(0).toUTCString()}`,
				},
			});
		}

		// Handle GET requests
		if (request.method === 'GET') {
			if (!cookies['api_token']) {
				return new Response('Unauthorized', {
					headers,
					status: 401,
				});
			}

			if (request.url.endsWith('/image')) {
				const imageResponse = await fetch('https://picsum.photos/200/300');

				// Convert the response body to a Uint8Array
				const bodyArrayBuffer = await imageResponse.arrayBuffer();
				const body = new Uint8Array(bodyArrayBuffer);

				// Clone the response so we can modify headers
				const modifiedResponse = new Response(body, imageResponse);

				// Set CORS headers to allow the image to be shared with the origin site
				modifiedResponse.headers.set('Access-Control-Allow-Origin', frontendUrl);
				modifiedResponse.headers.set('Access-Control-Allow-Credentials', 'true');
				modifiedResponse.headers.set('Vary', 'Origin'); // Ensures cache varies based on Origin header

				return modifiedResponse;
			}

			const body = { message: 'Cookie validated successfully' };
			return new Response(JSON.stringify(body), {
				status: 200,
				headers: {
					...headers,
					'Content-Type': 'application/json',
				},
			});
		}

		// Catch-all for other requests
		return new Response('Method not allowed', {
			status: 405,
			headers,
		});
	},
};
