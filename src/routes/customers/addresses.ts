import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import { DefaultState } from "koa";
import { z } from "zod";
import { CustomerAddress } from "../../db/models";
import { authenticate } from "../../middleware/auth";
import { 
  validateAndRequireCustomerAccess, 
  validateUuids, 
  ValidationContext 
} from "../../middleware/validation";
import { 
  sendValidationError, 
  sendNotFoundError, 
  sendInternalServerError
} from "../../utils/errors";

const addressSchema = z.object({
    street: z.string().min(1, { message: "street is required" }),
    city: z.string().min(1, { message: "city is required" }),
    state: z.string().min(1, { message: "state is required" }),
    postalCode: z.string().min(1, { message: "postalCode is required" }),
    country: z.string().min(1, { message: "country is required" }),
    addressType: z.string().optional() // e.g., 'home', 'work'
}).strict();

const router = new Router<DefaultState, ValidationContext>({
    prefix: '/customers/:customerId/addresses'
}).use(bodyParser()).use(authenticate);

router.get("/", validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;

    try {
        const addresses = await CustomerAddress.findAll({
            where: { customerId },
            attributes: { exclude: ['customerId', 'id', 'createdAt', 'updatedAt'] }
        });

        ctx.body = addresses;
        ctx.status = 200;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

router.post("/", validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;

    const result = addressSchema.safeParse(ctx.request.body);

    if (!result.success) {
        sendValidationError(ctx, result.error);
        return;
    }

    try {
        const address = result.data;
        const createdAddress = await CustomerAddress.create({ customerId, ...address });
        ctx.status = 201;
        ctx.body = createdAddress;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

router.get("/:id", validateUuids, validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;
    const addressId = ctx.validatedResourceId!;

    try {
        const address = await CustomerAddress.findOne({
            where: {
                id: addressId,
                customerId
            }
        });

        if (!address) {
            sendNotFoundError(ctx, 'Address');
            return;
        }

        ctx.body = address;
        ctx.status = 200;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

router.put("/:id", validateUuids, validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;
    const addressId = ctx.validatedResourceId!;

    const result = addressSchema.safeParse(ctx.request.body);

    if (!result.success) {
        sendValidationError(ctx, result.error);
        return;
    }

    try {
        const address = result.data;
        
        const updatedAddress = await CustomerAddress.findOne({
            where: {
                id: addressId,
                customerId
            }
        });

        if (!updatedAddress) {
            sendNotFoundError(ctx, 'Address');
            return;
        }

        await updatedAddress.update(address);
        ctx.status = 200;
        ctx.body = updatedAddress;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

router.delete("/:id", validateUuids, validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;
    const addressId = ctx.validatedResourceId!;

    try {
        const address = await CustomerAddress.findOne({
            where: {
                id: addressId,
                customerId
            }
        });

        if (!address) {
            sendNotFoundError(ctx, 'Address');
            return;
        }

        await address.destroy();
        ctx.status = 204;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

export default router;