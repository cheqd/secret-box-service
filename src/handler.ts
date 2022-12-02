import { CORS_HEADERS, HEADERS } from "./api/constants";
import { ErrorHandler } from "./error_handler";
import router from "./router";

export const handleRequest = async (request: Request): Promise<Response> => {
  // Handle CORS preflight request
  if (
    request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") !== null
  ) {
    const origin = "*";
    const methods = "GET, POST, PATCH, DELETE";
    const headers = "referer, origin, content-type, authorization";

    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": methods,
      "Access-Control-Allow-Headers": headers,
    };

    // Handle CORS pre-flight request.
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  return router
    .handle(request)
    .then((response: Response) => {
      for (const header of CORS_HEADERS) {
        response.headers.set(header[0], header[1]);
      }

      return response;
    })
    .catch((error: Error) => {
      return ErrorHandler.throw({
        msg: "unhandled exception occurred.",
        statusCode: 500,
        headers: HEADERS.json,
      });
    });
};
