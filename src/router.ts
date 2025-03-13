import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import { DefaultContext } from "./logging";
import { DefaultState } from "koa";
import { z } from "zod";
import { Customer, CustomerNote, CustomerPhone } from "./db/models";

const phoneSchema = z.object({
    phoneNumber: z.string().min(1, { message: "phoneNumber is required" }),
    designation: z.string().min(1, { message: "designation is required" })
}).strict();

const customerSchema = z.object({
    firstName: z.string().min(1, { message: "firstName is required" }),
    lastName: z.string().min(1, { message: "firstName is required" }),
    email: z.string().email({ message: "Invalid email address" }),
    phones: z.array(phoneSchema).optional()
}).strict();

const noteSchema = z.object({
    note: z.string().min(1, { message: "note is required" })
}).strict();

const router = new Router<DefaultState, DefaultContext>({
    prefix: '/customers'
}).use(bodyParser())

router.get("/", async (ctx) => {
    try {
        const customers = await Customer.findAll({
            include: [{
                model: CustomerNote,
                as: 'notes',
                attributes: { exclude: ['customerId'] }
            },
            {
                model: CustomerPhone,
                as: 'phones',
                attributes: { exclude: ['customerId', 'id', 'createdAt', 'updatedAt'] }
            }]
        });

        ctx.body = customers;
    } catch (error) {
        ctx.log.error(error)
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
})

router.post("/", async (ctx) => {
    const result = customerSchema.safeParse(ctx.request.body);

    if (!result.success) {
        ctx.status = 400;
        ctx.body = { errors: result.error.errors };
        return;
    }

    try {
        const { phones, ...customerData } = result.data;
        const customer = await Customer.create(customerData);

        if (phones && phones.length > 0) {
            await CustomerPhone.bulkCreate(phones.map(phone => ({ customerId: customer.id, ...phone })));
        }
        ctx.status = 201;
        ctx.body = customer;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

router.post("/:customerId/notes", async (ctx) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const customerId = ctx.params.customerId;

    if (!uuidRegex.test(customerId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid UUID format' };
        return;
    }

    const result = noteSchema.safeParse(ctx.request.body);

    if (!result.success) {
        ctx.status = 400;
        ctx.body = { errors: result.error.errors };
        return;
    }

    try {
        const note = await CustomerNote.create({ customerId, ...result.data });
        ctx.status = 201;
        ctx.body = note;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

export default router;