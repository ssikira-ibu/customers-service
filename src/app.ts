import Koa from 'koa';
import Router from 'koa-router';
import { sequelize, authenticate } from './db/database';
import { defineCustomerModel, Customer } from './db/customer';
const app = new Koa();
const router = new Router();

authenticate()
defineCustomerModel(sequelize)

// A simple route
router.get('/', async (ctx) => {
    ctx.body = 'Hello, World!';
});

app.use(router.routes()).use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
