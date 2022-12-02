import { ErrorHandler } from "../../error_handler";
import { HEADERS } from "../constants";
import { handleAuthToken } from "./authentication";

export class CryptoBox {
  storage: KVNamespace;

  constructor() {
    this.storage = CREDENTIALS;
  }

  async getCryptoBox(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const accountId = url.pathname.split("/").pop() || "";

    const token = request.headers.get("Authorization");
    if (!token) {
      return ErrorHandler.throw({
        msg: "Token is not placed in headers",
        statusCode: 400,
      });
    }

    // err is of Response kind as well
    const err = await handleAuthToken(token);
    if (err) {
      return err;
    }

    return await this.getFromKVStore(accountId);
  }

  async getFromKVStore(accountId: string): Promise<Response> {
    const value = await this.storage.get(accountId);
    if (!value) {
      return ErrorHandler.throw({
        msg: "value not found",
        statusCode: 400,
        headers: HEADERS.text,
      });
    }

    return new Response(JSON.stringify({ cryptoBox: JSON.parse(value) }), {
      headers: {
        ...HEADERS.json,
      },
    });
  }

  async authenticated(token: string): Promise<boolean> {
    const err = await handleAuthToken(token);
    return !!err;
  }

  async putToKVStore(request: Request) {
    const cryptoJson = await this.readJSONBody(request);
    if (!cryptoJson) {
      return ErrorHandler.throw({
        msg: "Post was rejected because wrong ContentType. JSON is expected",
        statusCode: 500,
        headers: HEADERS.text,
      });
    }

    const isAllowed = await this.authenticated(
      request.headers.get("Authorization") || ""
    );
    if (!isAllowed) {
      return ErrorHandler.throw({
        msg: "auth token is not valid.",
        statusCode: 500,
      });
    }

    await this.storage.put(
      cryptoJson["accountID"],
      JSON.stringify(cryptoJson["cryptoBox"])
    );
    return new Response("Value has been stored", { status: 200 });
  }

  async readJSONBody(request: Request): Promise<any> {
    const { headers } = request;
    const contentType = headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await request.json();
    }
  }

  async handlePostKVStore(request: Request): Promise<Response> {
    return await this.putToKVStore(request);
  }
}
