import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import { DefaultState } from "koa";
import { z } from "zod";
import { Customer, CustomerAddress, CustomerNote, CustomerPhone, CustomerReminder } from "../db/models";
import { authenticate } from "../middleware/auth";
import { validateCustomerId, ValidationContext } from "../middleware/validation";
import { Op, Sequelize, literal, fn, col, where } from "sequelize";
import { sequelize } from "../db/database";
import { ensureUserExists } from "../utils/user";
import { 
  sendValidationError, 
  sendNotFoundError, 
  sendInternalServerError, 
  sendConflictError,
  handleSequelizeError,
  sendError
} from "../utils/errors";

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

const customerUpdateSchema = z.object({
    firstName: z.string().min(1, { message: "firstName is required" }).optional(),
    lastName: z.string().min(1, { message: "lastName is required" }).optional(),
    email: z.string().email({ message: "Invalid email address" }).optional()
}).strict();

const noteSchema = z.object({
    note: z.string().min(1, { message: "note is required" })
}).strict();

const searchSchema = z.object({
    query: z.string().min(1, { message: "Search query is required" })
}).strict();

const router = new Router<DefaultState, ValidationContext>({
    prefix: '/customers'
})
    .use(bodyParser())
    .use(authenticate);

// GET /customers - Returns summary data optimized for lists/tables
router.get("/", async (ctx) => {
    try {
        // First get all customers for this user
        const customers = await Customer.findAll({
            where: {
                userId: ctx.user!.uid
            },
            order: [
                ['lastName', 'ASC'],
                ['firstName', 'ASC']
            ]
        });

        // Then get counts for each customer using Sequelize's count method
        const customersWithCounts = await Promise.all(
            customers.map(async (customer) => {
                const [phoneCount, addressCount, noteCount, reminderCount] = await Promise.all([
                    CustomerPhone.count({ where: { customerId: customer.id } }),
                    CustomerAddress.count({ where: { customerId: customer.id } }),
                    CustomerNote.count({ where: { customerId: customer.id } }),
                    CustomerReminder.count({ where: { customerId: customer.id } })
                ]);

                return {
                    id: customer.id,
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    email: customer.email,
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt,
                    count: {
                        phones: phoneCount,
                        addresses: addressCount,
                        notes: noteCount,
                        reminders: reminderCount
                    }
                };
            })
        );

        ctx.body = customersWithCounts;
        ctx.status = 200;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

// GET /customers/search - Search customers
router.get("/search", async (ctx) => {
    try {
        const { query } = searchSchema.parse(ctx.query);

        // Clean and prepare the search query
        const searchText = query.trim().toLowerCase();
        const queryLength = searchText.length;

        let whereClause: string;
        let rankingClause: string;

        if (queryLength <= 2) {
            // Very short queries: Use ILIKE pattern matching for immediate feedback
            const likePattern = `%${searchText}%`;
            whereClause = `
                "userId" = '${ctx.user!.uid}' AND (
                    "firstName" ILIKE '${likePattern}'
                    OR "lastName" ILIKE '${likePattern}'
                    OR email ILIKE '${likePattern}'
                )
            `;
            rankingClause = `
                CASE 
                    WHEN "firstName" ILIKE '${searchText}%' THEN 3
                    WHEN "lastName" ILIKE '${searchText}%' THEN 3
                    WHEN email ILIKE '${searchText}%' THEN 2
                    ELSE 1
                END
            `;
        } else if (queryLength <= 4) {
            // Short queries: Lower trigram threshold + prefix matching + fuzzy
            const likePattern = `%${searchText}%`;
            const prefixPattern = `${searchText}%`;
            whereClause = `
                "userId" = '${ctx.user!.uid}' AND (
                    -- Exact prefix matches (highest priority)
                    "firstName" ILIKE '${prefixPattern}'
                    OR "lastName" ILIKE '${prefixPattern}'
                    OR email ILIKE '${prefixPattern}'
                    OR
                    -- Fuzzy match with lower threshold for short queries
                    similarity(search_text, '${searchText}') > 0.15
                    OR
                    -- Substring matches
                    search_text ILIKE '${likePattern}'
                )
            `;
            rankingClause = `
                (
                    CASE 
                        WHEN "firstName" ILIKE '${prefixPattern}' THEN 5
                        WHEN "lastName" ILIKE '${prefixPattern}' THEN 5
                        WHEN email ILIKE '${prefixPattern}' THEN 4
                        ELSE 0
                    END +
                    similarity(search_text, '${searchText}') * 2 +
                    CASE 
                        WHEN search_text ILIKE '${likePattern}' THEN 1
                        ELSE 0
                    END
                ) / 3
            `;
        } else {
            // Longer queries: Enhanced full-text + trigram + substring
            const searchQuery = searchText.split(/\s+/).join(' & ');
            const likePattern = `%${searchText}%`;
            whereClause = `
                "userId" = '${ctx.user!.uid}' AND (
                    -- Full-text search with plainto_tsquery for flexible matching
                    search_vector @@ plainto_tsquery('english', '${searchText}')
                    OR
                    -- Traditional tsquery for exact phrase matching
                    search_vector @@ to_tsquery('english', '${searchQuery}')
                    OR
                    -- Fuzzy match using trigram similarity
                    similarity(search_text, '${searchText}') > 0.2
                    OR
                    -- Substring fallback
                    search_text ILIKE '${likePattern}'
                )
            `;
            rankingClause = `
                (
                    ts_rank(search_vector, plainto_tsquery('english', '${searchText}')) * 3 +
                    ts_rank(search_vector, to_tsquery('english', '${searchQuery}')) * 2 +
                    similarity(search_text, '${searchText}') * 2 +
                    CASE 
                        WHEN search_text ILIKE '${likePattern}' THEN 0.5
                        ELSE 0
                    END
                ) / 4
            `;
        }

        const customers = await Customer.findAll({
            where: Sequelize.literal(whereClause),
            attributes: {
                include: [
                    [literal(rankingClause), 'rank']
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
            sendValidationError(ctx, error);
            return;
        }

        ctx.log.error('Search error:', error);
        sendInternalServerError(ctx, 'An error occurred while searching customers');
    }
});

// GET /customers/:customerId - Returns full customer details with all related data
router.get("/:customerId", validateCustomerId, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;

    try {
        const customer = await Customer.findOne({
            where: {
                id: customerId,
                userId: ctx.user!.uid
            },
            attributes: { exclude: ['userId'] },
            include: [{
                model: CustomerNote,
                as: 'notes',
                attributes: { exclude: ['customerId'] },
                order: [['createdAt', 'DESC']]
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
                attributes: { exclude: ['customerId', 'id'] },
                order: [
                    ['dateCompleted', 'ASC NULLS FIRST'],
                    ['dueDate', 'ASC']
                ]
            }]
        });

        if (!customer) {
            sendNotFoundError(ctx, 'Customer');
            return;
        }

        ctx.body = customer;
        ctx.status = 200;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

// PUT /customers/:customerId - Update customer data
router.put("/:customerId", validateCustomerId, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;

    const result = customerUpdateSchema.safeParse(ctx.request.body);

    if (!result.success) {
        sendValidationError(ctx, result.error);
        return;
    }

    try {
        const customer = await Customer.findOne({
            where: {
                id: customerId,
                userId: ctx.user!.uid
            }
        });

        if (!customer) {
            sendNotFoundError(ctx, 'Customer');
            return;
        }

        // Check for email uniqueness if email is being updated
        if (result.data.email && result.data.email !== customer.email) {
            const existingCustomer = await Customer.findOne({
                where: {
                    email: result.data.email,
                    userId: ctx.user!.uid,
                    id: { [Op.ne]: customerId }
                }
            });

            if (existingCustomer) {
                sendConflictError(ctx, 'A customer with this email already exists');
                return;
            }
        }

        await customer.update(result.data);
        
        // Return updated customer without sensitive data
        const updatedCustomer = await Customer.findByPk(customerId, {
            attributes: { exclude: ['userId'] }
        });

        ctx.body = updatedCustomer;
        ctx.status = 200;
    } catch (error: any) {
        ctx.log.error(error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            sendError(ctx, 409, handleSequelizeError(error));
            return;
        }

        sendInternalServerError(ctx);
    }
});

// PATCH /customers/:customerId - Partial update customer data
router.patch("/:customerId", validateCustomerId, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;

    const result = customerUpdateSchema.safeParse(ctx.request.body);

    if (!result.success) {
        sendValidationError(ctx, result.error);
        return;
    }

    try {
        const customer = await Customer.findOne({
            where: {
                id: customerId,
                userId: ctx.user!.uid
            }
        });

        if (!customer) {
            sendNotFoundError(ctx, 'Customer');
            return;
        }

        // Check for email uniqueness if email is being updated
        if (result.data.email && result.data.email !== customer.email) {
            const existingCustomer = await Customer.findOne({
                where: {
                    email: result.data.email,
                    userId: ctx.user!.uid,
                    id: { [Op.ne]: customerId }
                }
            });

            if (existingCustomer) {
                sendConflictError(ctx, 'A customer with this email already exists');
                return;
            }
        }

        await customer.update(result.data);
        
        // Return updated customer without sensitive data
        const updatedCustomer = await Customer.findByPk(customerId, {
            attributes: { exclude: ['userId'] }
        });

        ctx.body = updatedCustomer;
        ctx.status = 200;
    } catch (error: any) {
        ctx.log.error(error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            sendError(ctx, 409, handleSequelizeError(error));
            return;
        }

        sendInternalServerError(ctx);
    }
});

router.post("/", async (ctx) => {
    const result = customerSchema.safeParse(ctx.request.body);

    if (!result.success) {
        sendValidationError(ctx, result.error);
        return;
    }

    try {
        const { phones, addresses, ...customerData } = result.data;

        // Ensure user exists in database, create if not
        await ensureUserExists(ctx.user!.uid);

        // Check if customer with this email already exists for the current user
        const existingCustomer = await Customer.findOne({
            where: {
                email: customerData.email,
                userId: ctx.user!.uid
            }
        });

        if (existingCustomer) {
            sendConflictError(ctx, 'A customer with this email already exists');
            return;
        }

        const customer = await Customer.create({
            ...customerData,
            userId: ctx.user!.uid
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
            sendError(ctx, 409, handleSequelizeError(error));
            return;
        }

        sendInternalServerError(ctx);
    }
});

router.delete("/:customerId", validateCustomerId, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;

    try {
        const customer = await Customer.findByPk(customerId);

        if (!customer) {
            sendNotFoundError(ctx, 'Customer');
            return;
        }

        await customer.destroy();
        ctx.status = 204;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

export default router;