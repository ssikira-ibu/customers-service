import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import { DefaultState } from "koa";
import { z } from "zod";
import { CustomerReminder } from "../../db/models";
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

const router = new Router<DefaultState, ValidationContext>({
    prefix: '/customers/:customerId/reminders'
}).use(bodyParser()).use(authenticate);

// Get all reminders for a customer
router.get("/", validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;

    try {
        const reminders = await CustomerReminder.findAll({
            where: {
                customerId,
                userId: ctx.user!.uid
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
        sendInternalServerError(ctx);
    }
});

// Create a new reminder for a customer
router.post("/", validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;

    const result = reminderSchema.safeParse(ctx.request.body);

    if (!result.success) {
        sendValidationError(ctx, result.error);
        return;
    }

    try {
        const reminder = await CustomerReminder.create({
            ...result.data,
            customerId,
            userId: ctx.user!.uid,
            dueDate: new Date(result.data.dueDate)
        });

        ctx.status = 201;
        ctx.body = reminder;
    } catch (error: any) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

// Get a specific reminder
router.get("/:id", validateUuids, validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;
    const reminderId = ctx.validatedResourceId!;

    try {
        const reminder = await CustomerReminder.findOne({
            where: {
                id: reminderId,
                customerId,
                userId: ctx.user!.uid
            }
        });

        if (!reminder) {
            sendNotFoundError(ctx, 'Reminder');
            return;
        }

        ctx.body = reminder;
        ctx.status = 200;
    } catch (error: any) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

// Update a reminder (PUT - full update)
router.put("/:id", validateUuids, validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;
    const reminderId = ctx.validatedResourceId!;

    const result = reminderSchema.safeParse(ctx.request.body);

    if (!result.success) {
        sendValidationError(ctx, result.error);
        return;
    }

    try {
        const reminder = await CustomerReminder.findOne({
            where: {
                id: reminderId,
                customerId,
                userId: ctx.user!.uid
            }
        });

        if (!reminder) {
            sendNotFoundError(ctx, 'Reminder');
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
        sendInternalServerError(ctx);
    }
});

// Update a reminder (PATCH - partial update)
router.patch("/:id", validateUuids, validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;
    const reminderId = ctx.validatedResourceId!;

    const result = reminderUpdateSchema.safeParse(ctx.request.body);

    if (!result.success) {
        sendValidationError(ctx, result.error);
        return;
    }

    try {
        const reminder = await CustomerReminder.findOne({
            where: {
                id: reminderId,
                customerId,
                userId: ctx.user!.uid
            }
        });

        if (!reminder) {
            sendNotFoundError(ctx, 'Reminder');
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
        sendInternalServerError(ctx);
    }
});

// Delete a reminder
router.delete("/:id", validateUuids, validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;
    const reminderId = ctx.validatedResourceId!;

    try {
        const reminder = await CustomerReminder.findOne({
            where: {
                id: reminderId,
                customerId,
                userId: ctx.user!.uid
            }
        });

        if (!reminder) {
            sendNotFoundError(ctx, 'Reminder');
            return;
        }

        await reminder.destroy();
        ctx.status = 204;
    } catch (error: any) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

export default router;