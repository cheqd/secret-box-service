import { Router } from "itty-router";
import auth_router from "./api/routes/authentication";
import { ErrorHandler } from "./error_handler";

const router = Router();

router.all("/api/authentication/*", auth_router.handle);

router.all("*", ErrorHandler.notFoundHandler);

export default router;
