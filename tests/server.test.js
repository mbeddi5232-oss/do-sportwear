const request = require('supertest');

const { app, models } = require('../server');

const { Product, User } = models;

describe('API integration tests', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('GET /health returns service metadata', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);

        expect(response.body.status).toBe('ok');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
    });

    test('GET /api/admin/products rejects unauthenticated requests', async () => {
        const response = await request(app)
            .get('/api/admin/products')
            .expect(401);

        expect(response.body.error).toMatch(/Non autoris/i);
    });

    test('POST /api/admin/login creates a session that unlocks admin routes', async () => {
        const agent = request.agent(app);
        const products = [
            { name: 'Training Shorts', price: 249, category: 'shorts' }
        ];

        jest.spyOn(Product, 'find').mockResolvedValue(products);

        const loginResponse = await agent
            .post('/api/admin/login')
            .send({
                email: 'admin@sportwear.ma',
                password: 'admin123'
            })
            .expect(200);

        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.admin.role).toBe('super_admin');

        const productsResponse = await agent
            .get('/api/admin/products')
            .expect(200);

        expect(productsResponse.body).toEqual(products);
    });

    test('POST /api/users/register validates email format', async () => {
        const response = await request(app)
            .post('/api/users/register')
            .send({
                firstName: 'Amine',
                lastName: 'Test',
                email: 'not-an-email',
                password: 'secret123'
            })
            .expect(400);

        expect(response.body.error).toBe('Format email invalide');
    });

    test('POST /api/users/register creates a user session that /api/users/check can read', async () => {
        const agent = request.agent(app);

        jest.spyOn(User, 'findOne').mockResolvedValue(null);
        jest.spyOn(User.prototype, 'save').mockImplementation(async function saveMock() {
            this._id = '507f1f77bcf86cd799439011';
            return this;
        });

        const registerResponse = await agent
            .post('/api/users/register')
            .send({
                firstName: 'Amine',
                lastName: 'Runner',
                email: 'amine@example.com',
                password: 'secret123',
                phone: '0600000000'
            })
            .expect(201);

        expect(registerResponse.body.success).toBe(true);
        expect(registerResponse.body.user.email).toBe('amine@example.com');

        const sessionResponse = await agent
            .get('/api/users/check')
            .expect(200);

        expect(sessionResponse.body.loggedIn).toBe(true);
        expect(sessionResponse.body.user.email).toBe('amine@example.com');
        expect(sessionResponse.body.user.name).toBe('Amine Runner');
    });

    test('POST /api/reviews requires an authenticated user', async () => {
        const response = await request(app)
            .post('/api/reviews')
            .send({
                productId: '507f1f77bcf86cd799439012',
                rating: 5,
                comment: 'Excellent produit'
            })
            .expect(401);

        expect(response.body.error).toMatch(/connecte/i);
    });

    test('POST /api/reviews validates the rating range for logged-in users', async () => {
        const agent = request.agent(app);

        jest.spyOn(User, 'findOne').mockResolvedValue(null);
        jest.spyOn(User.prototype, 'save').mockImplementation(async function saveMock() {
            this._id = '507f1f77bcf86cd799439013';
            return this;
        });

        await agent
            .post('/api/users/register')
            .send({
                firstName: 'Sara',
                lastName: 'Fit',
                email: 'sara@example.com',
                password: 'secret123'
            })
            .expect(201);

        const reviewResponse = await agent
            .post('/api/reviews')
            .send({
                productId: '507f1f77bcf86cd799439014',
                rating: 6,
                comment: 'Too high to be valid'
            })
            .expect(400);

        expect(reviewResponse.body.error).toBe('La note doit etre entre 1 et 5');
    });
});
