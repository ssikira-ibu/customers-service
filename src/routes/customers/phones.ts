import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import { DefaultContext } from "../../logging";
import { DefaultState } from "koa";
import { z } from "zod";
import { Customer, CustomerPhone } from "../../db/models";
import { authenticate, AuthContext } from "../../middleware/auth";

const phoneSchema = z.object({
    phoneNumber: z.string().min(1, { message: "phoneNumber is required" }),
    designation: z.string().min(1, { message: "designation is required" })
}).strict();

const router = new Router<DefaultState, AuthContext>({
    prefix: '/customers/:customerId/phones'
}).use(bodyParser()).use(authenticate);

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get("/", async (ctx) => {
    const customerId = ctx.params.customerId;

    if (!uuidRegex.test(customerId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid UUID format' };
        return;
    }

    if (!ctx.user?.uid) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    try {
        // Verify the customer exists and belongs to the current user
        const customer = await Customer.findOne({
            where: {
                id: customerId,
                userId: ctx.user.uid
            }
        });

        if (!customer) {
            ctx.status = 404;
            ctx.body = { error: 'Customer not found' };
            return;
        }

        const phones = await CustomerPhone.findAll({
            where: { customerId },
            attributes: { exclude: ['customerId', 'id', 'createdAt', 'updatedAt'] }
        });

        ctx.body = phones;
        ctx.status = 200;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

router.post("/", async (ctx) => {
    const customerId = ctx.params.customerId;

    if (!uuidRegex.test(customerId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid UUID format' };
        return;
    }

    if (!ctx.user?.uid) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    const result = phoneSchema.safeParse(ctx.request.body);

    if (!result.success) {
        ctx.status = 400;
        ctx.body = { errors: result.error.errors };
        return;
    }

    try {
        const phone = result.data;
        
        // Verify the customer exists and belongs to the current user
        const customer = await Customer.findOne({
            where: {
                id: customerId,
                userId: ctx.user.uid
            }
        });

        if (!customer) {
            ctx.status = 404;
            ctx.body = { error: 'Customer not found' };
            return;
        }

        const createdPhone = await CustomerPhone.create({ customerId, ...phone });
        ctx.status = 201;
        ctx.body = createdPhone;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

router.get("/:id", async (ctx) => {
    const customerId = ctx.params.customerId;
    const phoneId = ctx.params.id;

    if (!uuidRegex.test(customerId) || !uuidRegex.test(phoneId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid UUID format' };
        return;
    }

    if (!ctx.user?.uid) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    try {
        // Verify the customer exists and belongs to the current user
        const customer = await Customer.findOne({
            where: {
                id: customerId,
                userId: ctx.user.uid
            }
        });

        if (!customer) {
            ctx.status = 404;
            ctx.body = { error: 'Customer not found' };
            return;
        }

        const phone = await CustomerPhone.findOne({
            where: {
                id: phoneId,
                customerId
            }
        });

        if (!phone) {
            ctx.status = 404;
            ctx.body = { error: 'Phone not found' };
            return;
        }

        ctx.body = phone;
        ctx.status = 200;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

router.put("/:id", async (ctx) => {
    const customerId = ctx.params.customerId;
    const phoneId = ctx.params.id;

    if (!uuidRegex.test(customerId) || !uuidRegex.test(phoneId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid UUID format' };
        return;
    }

    if (!ctx.user?.uid) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    const result = phoneSchema.safeParse(ctx.request.body);

    if (!result.success) {
        ctx.status = 400;
        ctx.body = { errors: result.error.errors };
        return;
    }

    try {
        const phone = result.data;
        
        // Verify the customer exists and belongs to the current user
        const customer = await Customer.findOne({
            where: {
                id: customerId,
                userId: ctx.user.uid
            }
        });

        if (!customer) {
            ctx.status = 404;
            ctx.body = { error: 'Customer not found' };
            return;
        }

        const updatedPhone = await CustomerPhone.findOne({
            where: {
                id: phoneId,
                customerId
            }
        });

        if (!updatedPhone) {
            ctx.status = 404;
            ctx.body = { error: 'Phone not found' };
            return;
        }

        await updatedPhone.update(phone);
        ctx.status = 200;
        ctx.body = updatedPhone;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

router.delete("/:id", async (ctx) => {
    const customerId = ctx.params.customerId;
    const phoneId = ctx.params.id;

    if (!uuidRegex.test(customerId) || !uuidRegex.test(phoneId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid UUID format' };
        return;
    }

    if (!ctx.user?.uid) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    try {
        // Verify the customer exists and belongs to the current user
        const customer = await Customer.findOne({
            where: {
                id: customerId,
                userId: ctx.user.uid
            }
        });

        if (!customer) {
            ctx.status = 404;
            ctx.body = { error: 'Customer not found' };
            return;
        }

        const phone = await CustomerPhone.findOne({
            where: {
                id: phoneId,
                customerId
            }
        });

        if (!phone) {
            ctx.status = 404;
            ctx.body = { error: 'Phone not found' };
            return;
        }

        await phone.destroy();
        ctx.status = 204;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

export default router; 