import Router from "koa-router";
import { DefaultContext } from "../../logging";
import { DefaultState } from "koa";
import customerRoutes from "../customers";
import phoneRoutes from "./phones";
import addressRoutes from "./addresses";
import noteRoutes from "./notes";

const router = new Router<DefaultState, DefaultContext>();

router.use(customerRoutes.routes());
router.use(phoneRoutes.routes());
router.use(addressRoutes.routes());
router.use(noteRoutes.routes());

export default router; 