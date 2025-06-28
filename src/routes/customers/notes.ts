import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import { DefaultState } from "koa";
import { z } from "zod";
import { CustomerNote } from "../../db/models";
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

const noteSchema = z.object({
    note: z.string().min(1, { message: "note is required" })
}).strict();

const router = new Router<DefaultState, ValidationContext>({
    prefix: '/customers/:customerId/notes'
}).use(bodyParser()).use(authenticate);

router.get("/", validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;

    try {
        const notes = await CustomerNote.findAll({
            where: { customerId },
            attributes: { exclude: ['customerId'] },
            order: [['createdAt', 'DESC']]
        });

        ctx.body = notes;
        ctx.status = 200;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

router.post("/", validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;

    const result = noteSchema.safeParse(ctx.request.body);

    if (!result.success) {
        sendValidationError(ctx, result.error);
        return;
    }

    try {
        const note = await CustomerNote.create({ customerId, ...result.data });
        ctx.status = 201;
        ctx.body = note;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

router.get("/:id", validateUuids, validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;
    const noteId = ctx.validatedResourceId!;

    try {
        const note = await CustomerNote.findOne({
            where: {
                id: noteId,
                customerId
            }
        });

        if (!note) {
            sendNotFoundError(ctx, 'Note');
            return;
        }

        ctx.body = note;
        ctx.status = 200;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

router.put("/:id", validateUuids, validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;
    const noteId = ctx.validatedResourceId!;

    const result = noteSchema.safeParse(ctx.request.body);

    if (!result.success) {
        sendValidationError(ctx, result.error);
        return;
    }

    try {
        const note = result.data;
        
        const updatedNote = await CustomerNote.findOne({
            where: {
                id: noteId,
                customerId
            }
        });

        if (!updatedNote) {
            sendNotFoundError(ctx, 'Note');
            return;
        }

        await updatedNote.update(note);
        ctx.status = 200;
        ctx.body = updatedNote;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

router.delete("/:id", validateUuids, validateAndRequireCustomerAccess, async (ctx) => {
    const customerId = ctx.validatedCustomerId!;
    const noteId = ctx.validatedResourceId!;

    try {
        const note = await CustomerNote.findOne({
            where: {
                id: noteId,
                customerId
            }
        });

        if (!note) {
            sendNotFoundError(ctx, 'Note');
            return;
        }

        await note.destroy();
        ctx.status = 204;
    } catch (error) {
        ctx.log.error(error);
        sendInternalServerError(ctx);
    }
});

export default router;