import { Router } from "itty-router";
import { handleAuthRequest } from "../controllers/authentication";
import { CryptoBox } from "../controllers/crypto_box";

const router = Router({ base: "/api/authentication" });

router
  .all("/", () => new Response(JSON.stringify({ ping: "pong" })))
  .post("/exchangeWalletToken", handleAuthRequest)
  .get("/cryptoBox/*", async (request: Request) => {
    return await new CryptoBox().getCryptoBox(request);
  })
  .post("/cryptoBox/*", async (request: Request) => {
    return await new CryptoBox().handlePostKVStore(request);
  });

export default router;
