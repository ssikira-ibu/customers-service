import Koa from 'koa';
import { DefaultContext, logger } from './logging';
import { sequelize, authenticate } from './db/database';
import { defineCustomerModel, Customer, defineCustomerNoteModel, buildAssociations } from './db/customer';
import router from './router';

const app = new Koa<Koa.DefaultState, DefaultContext>();
app.context.log = logger;

authenticate()
defineCustomerModel(sequelize)
defineCustomerNoteModel(sequelize)
buildAssociations()

sequelize.sync()

app.use(async (ctx, next) => {
    await next();
    const rt = ctx.response.get('X-Response-Time');
    ctx.log.debug(`${ctx.method} ${ctx.url} - ${rt}`);
});

// x-response-time

app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    ctx.set('X-Response-Time', `${ms}ms`);
});

app
    .use(router.routes())
    .use(router.allowedMethods());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
