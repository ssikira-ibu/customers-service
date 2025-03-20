import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import { DefaultContext } from "../../logging";
import { DefaultState } from "koa";
import { z } from "zod";
import { Customer, CustomerAddress } from "../../db/models";

const addressSchema = z.object({
    street: z.string().min(1, { message: "street is required" }),
    city: z.string().min(1, { message: "city is required" }),
    state: z.string().min(1, { message: "state is required" }),
    postalCode: z.string().min(1, { message: "postalCode is required" }),
    country: z.string().min(1, { message: "country is required" }),
    addressType: z.string().optional() // e.g., 'home', 'work'
}).strict();

const router = new Router<DefaultState, DefaultContext>({
    prefix: '/customers/:customerId/addresses'
}).use(bodyParser());

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get("/", async (ctx) => {
    const customerId = ctx.params.customerId;

    if (!uuidRegex.test(customerId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid UUID format' };
        return;
    }

    try {
        const addresses = await CustomerAddress.findAll({
            where: { customerId },
            attributes: { exclude: ['customerId', 'id', 'createdAt', 'updatedAt'] }
        });

        ctx.body = addresses;
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

    const result = addressSchema.safeParse(ctx.request.body);

    if (!result.success) {
        ctx.status = 400;
        ctx.body = { errors: result.error.errors };
        return;
    }

    try {
        const address = result.data;
        const customer = await Customer.findByPk(customerId);

        if (!customer) {
            ctx.status = 404;
            ctx.body = { error: 'Customer not found' };
            return;
        }

        const createdAddress = await CustomerAddress.create({ customerId, ...address });
        ctx.status = 201;
        ctx.body = createdAddress;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

router.get("/:id", async (ctx) => {
    const customerId = ctx.params.customerId;
    const addressId = ctx.params.id;

    if (!uuidRegex.test(customerId) || !uuidRegex.test(addressId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid UUID format' };
        return;
    }

    try {
        const address = await CustomerAddress.findByPk(addressId);

        if (!address) {
            ctx.status = 404;
            ctx.body = { error: 'Address not found' };
            return;
        }

        ctx.body = address;
        ctx.status = 200;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

router.put("/:id", async (ctx) => {
    const customerId = ctx.params.customerId;
    const addressId = ctx.params.id;

    if (!uuidRegex.test(customerId) || !uuidRegex.test(addressId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid UUID format' };
        return;
    }

    const result = addressSchema.safeParse(ctx.request.body);

    if (!result.success) {
        ctx.status = 400;
        ctx.body = { errors: result.error.errors };
        return;
    }

    try {
        const address = result.data;
        const customer = await Customer.findByPk(customerId);

        if (!customer) {
            ctx.status = 404;
            ctx.body = { error: 'Customer not found' };
            return;
        }

        const updatedAddress = await CustomerAddress.findByPk(addressId);

        if (!updatedAddress) {
            ctx.status = 404;
            ctx.body = { error: 'Address not found' };
            return;
        }

        await updatedAddress.update(address);
        ctx.status = 200;
        ctx.body = updatedAddress;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

router.delete("/:id", async (ctx) => {
    const customerId = ctx.params.customerId;
    const addressId = ctx.params.id;

    if (!uuidRegex.test(customerId) || !uuidRegex.test(addressId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid UUID format' };
        return;
    }

    try {
        const customer = await Customer.findByPk(customerId);

        if (!customer) {
            ctx.status = 404;
            ctx.body = { error: 'Customer not found' };
            return;
        }

        const address = await CustomerAddress.findByPk(addressId);

        if (!address) {
            ctx.status = 404;
            ctx.body = { error: 'Address not found' };
            return;
        }

        await address.destroy();
        ctx.status = 204;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

export default router; 