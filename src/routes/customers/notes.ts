import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import { DefaultContext } from "../../logging";
import { DefaultState } from "koa";
import { z } from "zod";
import { Customer, CustomerNote } from "../../db/models";
import { authenticate, AuthContext } from "../../middleware/auth";

const noteSchema = z.object({
    note: z.string().min(1, { message: "note is required" })
}).strict();

const router = new Router<DefaultState, AuthContext>({
    prefix: '/customers/:customerId/notes'
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

        const notes = await CustomerNote.findAll({
            where: { customerId },
            attributes: { exclude: ['customerId'] },
            order: [['createdAt', 'DESC']]
        });

        ctx.body = notes;
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

    const result = noteSchema.safeParse(ctx.request.body);

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

        const note = await CustomerNote.create({ customerId, ...result.data });
        ctx.status = 201;
        ctx.body = note;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

router.get("/:id", async (ctx) => {
    const customerId = ctx.params.customerId;
    const noteId = ctx.params.id;

    if (!uuidRegex.test(customerId) || !uuidRegex.test(noteId)) {
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

        const note = await CustomerNote.findOne({
            where: {
                id: noteId,
                customerId
            }
        });

        if (!note) {
            ctx.status = 404;
            ctx.body = { error: 'Note not found' };
            return;
        }

        ctx.body = note;
        ctx.status = 200;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

router.put("/:id", async (ctx) => {
    const customerId = ctx.params.customerId;
    const noteId = ctx.params.id;

    if (!uuidRegex.test(customerId) || !uuidRegex.test(noteId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid UUID format' };
        return;
    }

    if (!ctx.user?.uid) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }

    const result = noteSchema.safeParse(ctx.request.body);

    if (!result.success) {
        ctx.status = 400;
        ctx.body = { errors: result.error.errors };
        return;
    }

    try {
        const note = result.data;
        
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

        const updatedNote = await CustomerNote.findOne({
            where: {
                id: noteId,
                customerId
            }
        });

        if (!updatedNote) {
            ctx.status = 404;
            ctx.body = { error: 'Note not found' };
            return;
        }

        await updatedNote.update(note);
        ctx.status = 200;
        ctx.body = updatedNote;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

router.delete("/:id", async (ctx) => {
    const customerId = ctx.params.customerId;
    const noteId = ctx.params.id;

    if (!uuidRegex.test(customerId) || !uuidRegex.test(noteId)) {
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

        const note = await CustomerNote.findOne({
            where: {
                id: noteId,
                customerId
            }
        });

        if (!note) {
            ctx.status = 404;
            ctx.body = { error: 'Note not found' };
            return;
        }

        await note.destroy();
        ctx.status = 204;
    } catch (error) {
        ctx.log.error(error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server Error' };
    }
});

export default router; 