import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import { DefaultState } from "koa";
import { z } from "zod";
import { Customer, CustomerReminder } from "../../db/models";
import { authenticate, AuthContext } from "../../middleware/auth";
import { Op } from "sequelize";

const reminderSchema = z.object({
    description: z.string().max(1000).nullable().optional(),
    dueDate: z.string().datetime({ message: "Invalid date format" }),
    priority: z.enum(['low', 'medium', 'high']).optional(),
}).strict();

const reminderUpdateSchema = z.object({
    description: z.string().max(1000).nullable().optional(),
    dueDate: z.string().datetime({ message: "Invalid date format" }).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    dateCompleted: z.string().datetime({ message: "Invalid date format" }).nullable().optional(),
}).strict();

const router = new Router<DefaultState, AuthContext>({
    prefix: '/customers/:customerId/reminders'
}).use(bodyParser()).use(authenticate);

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Get all reminders for a customer
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

        const reminders = await CustomerReminder.findAll({
            where: {
                customerId,
                userId: ctx.user.uid
            },
            order: [
                ['dateCompleted', 'ASC NULLS FIRST'],
                ['dueDate', 'ASC']
            ]
        });

        ctx.body = reminders;
        ctx.status = 200;
    } catch (error: any) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

// Create a new reminder for a customer
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

    const result = reminderSchema.safeParse(ctx.request.body);

    if (!result.success) {
        ctx.status = 400;
        ctx.body = { errors: result.error.errors };
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

        const reminder = await CustomerReminder.create({
            ...result.data,
            customerId,
            userId: ctx.user.uid,
            dueDate: new Date(result.data.dueDate)
        });

        ctx.status = 201;
        ctx.body = reminder;
    } catch (error: any) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

// Get a specific reminder
router.get("/:id", async (ctx) => {
    const customerId = ctx.params.customerId;
    const reminderId = ctx.params.id;

    if (!uuidRegex.test(customerId) || !uuidRegex.test(reminderId)) {
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
        const reminder = await CustomerReminder.findOne({
            where: {
                id: reminderId,
                customerId,
                userId: ctx.user.uid
            }
        });

        if (!reminder) {
            ctx.status = 404;
            ctx.body = { error: 'Reminder not found' };
            return;
        }

        ctx.body = reminder;
        ctx.status = 200;
    } catch (error: any) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

// Update a reminder (PUT - full update)
router.put("/:id", async (ctx) => {
    const customerId = ctx.params.customerId;
    const reminderId = ctx.params.id;

    if (!uuidRegex.test(customerId) || !uuidRegex.test(reminderId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid UUID format' };
        return;
    }

    if (!ctx.user?.uid) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    const result = reminderSchema.safeParse(ctx.request.body);

    if (!result.success) {
        ctx.status = 400;
        ctx.body = { errors: result.error.errors };
        return;
    }

    try {
        const reminder = await CustomerReminder.findOne({
            where: {
                id: reminderId,
                customerId,
                userId: ctx.user.uid
            }
        });

        if (!reminder) {
            ctx.status = 404;
            ctx.body = { error: 'Reminder not found' };
            return;
        }

        await reminder.update({
            ...result.data,
            dueDate: new Date(result.data.dueDate)
        });

        ctx.status = 200;
        ctx.body = reminder;
    } catch (error: any) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

// Update a reminder (PATCH - partial update)
router.patch("/:id", async (ctx) => {
    const customerId = ctx.params.customerId;
    const reminderId = ctx.params.id;

    if (!uuidRegex.test(customerId) || !uuidRegex.test(reminderId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid UUID format' };
        return;
    }

    if (!ctx.user?.uid) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    const result = reminderUpdateSchema.safeParse(ctx.request.body);

    if (!result.success) {
        ctx.status = 400;
        ctx.body = { errors: result.error.errors };
        return;
    }

    try {
        const reminder = await CustomerReminder.findOne({
            where: {
                id: reminderId,
                customerId,
                userId: ctx.user.uid
            }
        });

        if (!reminder) {
            ctx.status = 404;
            ctx.body = { error: 'Reminder not found' };
            return;
        }

        const updateData: any = { ...result.data };
        
        // Handle dateCompleted specially - can be null to reopen
        if (result.data.dateCompleted !== undefined) {
            updateData.dateCompleted = result.data.dateCompleted ? new Date(result.data.dateCompleted) : null;
        }
        
        // Handle dueDate if provided
        if (result.data.dueDate) {
            updateData.dueDate = new Date(result.data.dueDate);
        }

        await reminder.update(updateData);

        ctx.status = 200;
        ctx.body = reminder;
    } catch (error: any) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

// Delete a reminder
router.delete("/:id", async (ctx) => {
    const customerId = ctx.params.customerId;
    const reminderId = ctx.params.id;

    if (!uuidRegex.test(customerId) || !uuidRegex.test(reminderId)) {
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
        const reminder = await CustomerReminder.findOne({
            where: {
                id: reminderId,
                customerId,
                userId: ctx.user.uid
            }
        });

        if (!reminder) {
            ctx.status = 404;
            ctx.body = { error: 'Reminder not found' };
            return;
        }

        await reminder.destroy();
        ctx.status = 204;
    } catch (error: any) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

export default router;
