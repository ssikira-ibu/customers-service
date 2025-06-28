import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import { DefaultState } from "koa";
import { z } from "zod";
import { Op } from "sequelize";
import { CustomerPhone } from "../../db/models";
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

const phoneSchema = z.object({
    phoneNumber: z.string().min(1, { message: "phoneNumber is required" }),
    designation: z.string().min(1, { message: "designation is required" })
}).strict();

const router = new Router<DefaultState, ValidationContext>({
    prefix: '/customers/:customerId/phones'
}).use(bodyParser()).use(authenticate);

router.get("/", validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;

    try {
        const phones = await CustomerPhone.findAll({
            where: { customerId },
            attributes: { exclude: ['customerId', 'id', 'createdAt', 'updatedAt'] }
        });

        ctx.body = phones;
        ctx.status = 200;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

router.post("/", validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;

    const result = phoneSchema.safeParse(ctx.request.body);

    if (!result.success) {
        sendValidationError(ctx, result.error);
        return;
    }

    try {
        const phone = result.data;
        
        // Check if phone number already exists for this customer
        const existingPhone = await CustomerPhone.findOne({
            where: { 
                customerId, 
                phoneNumber: phone.phoneNumber 
            }
        });

        if (existingPhone) {
            ctx.status = 400;
            ctx.body = { error: "Phone number already exists for this customer" };
            return;
        }

        const createdPhone = await CustomerPhone.create({ customerId, ...phone });
        ctx.status = 201;
        ctx.body = createdPhone;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

router.get("/:id", validateUuids, validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;
    const phoneId = ctx.validatedResourceId!;

    try {
        const phone = await CustomerPhone.findOne({
            where: {
                id: phoneId,
                customerId
            }
        });

        if (!phone) {
            sendNotFoundError(ctx, 'Phone');
            return;
        }

        ctx.body = phone;
        ctx.status = 200;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

router.put("/:id", validateUuids, validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;
    const phoneId = ctx.validatedResourceId!;

    const result = phoneSchema.safeParse(ctx.request.body);

    if (!result.success) {
        sendValidationError(ctx, result.error);
        return;
    }

    try {
        const phone = result.data;
        
        const updatedPhone = await CustomerPhone.findOne({
            where: {
                id: phoneId,
                customerId
            }
        });

        if (!updatedPhone) {
            sendNotFoundError(ctx, 'Phone');
            return;
        }

        // Check if phone number already exists for this customer (excluding current phone)
        const existingPhone = await CustomerPhone.findOne({
            where: { 
                customerId, 
                phoneNumber: phone.phoneNumber,
                id: { [Op.ne]: phoneId }
            }
        });

        if (existingPhone) {
            ctx.status = 400;
            ctx.body = { error: "Phone number already exists for this customer" };
            return;
        }

        await updatedPhone.update(phone);
        ctx.status = 200;
        ctx.body = updatedPhone;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

router.delete("/:id", validateUuids, validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;
    const phoneId = ctx.validatedResourceId!;

    try {
        const phone = await CustomerPhone.findOne({
            where: {
                id: phoneId,
                customerId
            }
        });

        if (!phone) {
            sendNotFoundError(ctx, 'Phone');
            return;
        }

        await phone.destroy();
        ctx.status = 204;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

export default router;