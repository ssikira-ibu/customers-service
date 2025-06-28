import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import { DefaultState } from "koa";
import { z } from "zod";
import { CustomerReminder, Customer } from "../db/models";
import { authenticate, AuthContext } from "../middleware/auth";
import { Op } from "sequelize";
import { 
  sendValidationError, 
  sendInternalServerError
} from "../utils/errors";

const reminderQuerySchema = z.object({
  status: z.enum(['active', 'overdue', 'completed', 'all']).optional().default('all'),
  include: z.string().optional()
}).strict();

const router = new Router<DefaultState, AuthContext>({
  prefix: '/reminders'
}).use(bodyParser()).use(authenticate);

// GET /reminders/analytics - Global analytics for all reminders
router.get("/analytics", async (ctx) => {
  try {
    const userId = ctx.user!.uid;
    const now = new Date();

    // Get all counts in parallel using efficient queries
    const [total, completed, overdue] = await Promise.all([
      CustomerReminder.count({
        where: { userId }
      }),
      CustomerReminder.count({
        where: { 
          userId,
          dateCompleted: { [Op.ne]: null }
        }
      }),
      CustomerReminder.count({
        where: { 
          userId,
          dateCompleted: null,
          dueDate: { [Op.lt]: now }
        }
      })
    ]);

    const active = total - completed;
    const completionRate = total > 0 ? completed / total : 0;

    ctx.body = {
      counts: {
        total,
        active,
        overdue, 
        completed
      },
      completionRate: Math.round(completionRate * 100) / 100 // Round to 2 decimal places
    };
    ctx.status = 200;
  } catch (error: any) {
    ctx.log.error(error);
    sendInternalServerError(ctx);
  }
});

// GET /reminders - Global list of reminders with customer data
router.get("/", async (ctx) => {
  const queryResult = reminderQuerySchema.safeParse(ctx.query);
  
  if (!queryResult.success) {
    sendValidationError(ctx, queryResult.error);
    return;
  }

  const { status, include } = queryResult.data;

  try {
    const userId = ctx.user!.uid;
    const now = new Date();
    
    // Build where conditions based on status filter
    let whereConditions: any = { userId };
    
    switch (status) {
      case 'active':
        whereConditions.dateCompleted = null;
        break;
      case 'overdue':
        whereConditions.dateCompleted = null;
        whereConditions.dueDate = { [Op.lt]: now };
        break;
      case 'completed':
        whereConditions.dateCompleted = { [Op.ne]: null };
        break;
      case 'all':
      default:
        // No additional filters
        break;
    }

    const includeCustomer = include === 'customer';
    
    const reminders = await CustomerReminder.findAll({
      where: whereConditions,
      ...(includeCustomer && {
        include: [{
          model: Customer,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      }),
      order: [
        ['dateCompleted', 'ASC NULLS FIRST'], // Incomplete first
        ['dueDate', 'ASC'] // Then by due date
      ]
    });

    ctx.body = reminders;
    ctx.status = 200;
  } catch (error: any) {
    ctx.log.error(error);
    sendInternalServerError(ctx);
  }
});

export default router;