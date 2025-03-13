import Router from "koa-router";
import { Customer } from "./db/customer";
import bodyParser from "koa-bodyparser";
import { DefaultContext } from "./logging";
import { DefaultState } from "koa";
import { CustomerNote } from "./db/customer";
import { z } from "zod";

const customerSchema = z.object({
    firstName: z.string().min(1, { message: "firstName is required" }),
    lastName: z.string().min(1, { message: "firstName is required" }),
    email: z.string().email({ message: "Invalid email address" })
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
        const customer = await Customer.create(result.data);
        ctx.status = 201;
        ctx.body = customer;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

router.post("/:customerId/notes", async (ctx) => {
    const customerId = parseInt(ctx.params.customerId);

    if (isNaN(customerId)) {
        ctx.throw(400, 'customerId must be a number');
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