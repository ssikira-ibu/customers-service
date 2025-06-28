import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import { DefaultContext } from "../logging";
import { DefaultState } from "koa";
import { z } from "zod";
import { Customer, CustomerAddress, CustomerNote, CustomerPhone, CustomerReminder } from "../db/models";
import { authenticate } from "../middleware/auth";
import { Op, Sequelize, literal } from "sequelize";
import { ensureUserExists } from "../utils/user";

const phoneSchema = z.object({
    phoneNumber: z.string().min(1, { message: "phoneNumber is required" }),
    designation: z.string().min(1, { message: "designation is required" })
}).strict();

const addressSchema = z.object({
    street: z.string().min(1, { message: "street is required" }),
    city: z.string().min(1, { message: "city is required" }),
    state: z.string().min(1, { message: "state is required" }),
    postalCode: z.string().min(1, { message: "postalCode is required" }),
    country: z.string().min(1, { message: "country is required" }),
    addressType: z.string().optional() // e.g., 'home', 'work'
}).strict();

const customerSchema = z.object({
    firstName: z.string().min(1, { message: "firstName is required" }),
    lastName: z.string().min(1, { message: "firstName is required" }),
    email: z.string().email({ message: "Invalid email address" }),
    phones: z.array(phoneSchema).optional(),
    addresses: z.array(addressSchema).optional()
}).strict();

const noteSchema = z.object({
    note: z.string().min(1, { message: "note is required" })
}).strict();

const searchSchema = z.object({
    query: z.string().min(1, { message: "Search query is required" })
}).strict();

const router = new Router<DefaultState, DefaultContext>({
    prefix: '/customers'
})
    .use(bodyParser())
    .use(authenticate);

router.get("/", async (ctx) => {
    try {
        const customers = await Customer.findAll({
            order: [
                ['lastName', 'ASC'],
                ['firstName', 'ASC']
            ],
            where: {
                userId: ctx.user.uid
            },
            attributes: { exclude: ['userId', 'createdAt', 'updatedAt'] },
            include: [{
                model: CustomerNote,
                as: 'notes',
                attributes: { exclude: ['customerId'] }
            },
            {
                model: CustomerPhone,
                as: 'phones',
                attributes: { exclude: ['customerId', 'id', 'createdAt', 'updatedAt'] }
            },
            {
                model: CustomerAddress,
                as: 'addresses',
                attributes: { exclude: ['customerId', 'id', 'createdAt', 'updatedAt'] }
            },
            {
                model: CustomerReminder,
                as: 'reminders',
                attributes: { exclude: ['customerId', 'id'] }
            }
            ]
        });

        ctx.body = customers;
        ctx.status = 200;
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
        const { phones, addresses, ...customerData } = result.data;

        // Ensure user exists in database, create if not
        await ensureUserExists(ctx.user.uid);

        // Check if customer with this email already exists for the current user
        const existingCustomer = await Customer.findOne({
            where: {
                email: customerData.email,
                userId: ctx.user.uid
            }
        });

        if (existingCustomer) {
            ctx.status = 409; // Conflict
            ctx.body = { error: 'A customer with this email already exists' };
            return;
        }

        const customer = await Customer.create({
            ...customerData,
            userId: ctx.user.uid
        });

        if (phones && phones.length > 0) {
            await CustomerPhone.bulkCreate(phones.map(phone => ({ customerId: customer.id, ...phone })));
        }

        if (addresses && addresses.length > 0) {
            await CustomerAddress.bulkCreate(addresses.map(address => ({ customerId: customer.id, ...address })));
        }

        ctx.status = 201;
        ctx.body = customer;
    } catch (error: any) {
        ctx.log.error(error);

        // Check for unique constraint violation
        if (error.name === 'SequelizeUniqueConstraintError') {
            ctx.status = 409; // Conflict
            ctx.body = { error: 'A customer with this email already exists' };
            return;
        }

        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

router.delete("/:customerId", async (ctx) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const customerId = ctx.params.customerId;

    if (!uuidRegex.test(customerId)) {
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

        await customer.destroy();
        ctx.status = 204;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

router.get("/search", async (ctx) => {
    try {
        const { query } = searchSchema.parse(ctx.query);

        // Clean and prepare the search query
        const searchText = query.trim().toLowerCase();
        const searchQuery = searchText.split(/\s+/).join(' & ');

        const customers = await Customer.findAll({
            where: Sequelize.literal(`
                "userId" = '${ctx.user.uid}' AND (
                    -- Full-text search match
                    search_vector @@ to_tsquery('english', '${searchQuery}')
                    OR
                    -- Fuzzy match using trigram similarity
                    similarity(search_text, '${searchText}') > 0.3
                )
            `),
            attributes: {
                include: [
                    [
                        // Combine both ranking methods
                        literal(`
                            (
                                ts_rank(search_vector, to_tsquery('english', '${searchQuery}')) * 2 +
                                similarity(search_text, '${searchText}')
                            ) / 3
                        `),
                        'rank'
                    ]
                ]
            },
            order: [
                [literal('rank'), 'DESC'],
                ['lastName', 'ASC'],
                ['firstName', 'ASC']
            ]
        });

        ctx.body = customers;
    } catch (error) {
        if (error instanceof z.ZodError) {
            ctx.status = 400;
            ctx.body = {
                error: "Validation failed",
                details: error.errors
            };
            return;
        }

        ctx.status = 500;
        ctx.body = {
            error: "An error occurred while searching customers"
        };
        ctx.app.emit('error', error, ctx);
    }
});

export default router;