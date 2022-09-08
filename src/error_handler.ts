
// Handle the CaptureStackTrace from NodeJS
// Add a logger as well with leveled logging
export class ErrorHandler extends Error {
	public readonly statusCode: number = 0;
	public readonly method: string = '';

	constructor(msg: any, method?: string, statusCode?: number) {
		super()
		this.message = msg
		if (method) this.method = method
		if (statusCode) this.statusCode = statusCode
	}

	// use generic maybe? or try method overriding with declaration merging
	static throw(opts: { msg: string, method?: string, statusCode?: number, headers?: HeadersInit }): Response {
		const errHandler = new ErrorHandler(opts.msg, opts.method, opts.statusCode)
		return new Response(errHandler.message, { status: 400, headers: opts.headers })
	}

	static notFoundHandler = (request: Request): Response => {
		return this.throw({ msg: 'not found', statusCode: 404 })
	}
}

