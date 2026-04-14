const request = require('supertest');

const { app, models } = require('../server');

const { Product, Order, User, Review } = models;

function mockSortedQuery(result) {
    return {
        sort: jest.fn().mockResolvedValue(result)
    };
}

function mockSelectedPopulatedQuery(result) {
    return {
        select: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(result)
        })
    };
}

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

    test('GET /api/admin/check returns loggedIn false without a session', async () => {
        const response = await request(app)
            .get('/api/admin/check')
            .expect(200);

        expect(response.body).toEqual({ loggedIn: false });
    });

    test('POST /api/admin/logout clears the admin session', async () => {
        const agent = request.agent(app);

        await agent
            .post('/api/admin/login')
            .send({
                email: 'admin@sportwear.ma',
                password: 'admin123'
            })
            .expect(200);

        const logoutResponse = await agent
            .post('/api/admin/logout')
            .expect(200);

        expect(logoutResponse.body.success).toBe(true);

        const checkResponse = await agent
            .get('/api/admin/check')
            .expect(200);

        expect(checkResponse.body.loggedIn).toBe(false);
    });

    test('POST /api/admin/products rejects moderators for super-admin-only actions', async () => {
        const agent = request.agent(app);

        await agent
            .post('/api/admin/login')
            .send({
                email: 'moderator@sportwear.ma',
                password: 'admin123'
            })
            .expect(200);

        const response = await agent
            .post('/api/admin/products')
            .send({
                name: 'Pro Hoodie',
                price: 399,
                category: 'hoodies'
            })
            .expect(403);

        expect(response.body.error).toMatch(/super admin/i);
    });

    test('POST /api/admin/products creates a product for super admins', async () => {
        const agent = request.agent(app);

        jest.spyOn(Product.prototype, 'save').mockImplementation(async function saveMock() {
            this._id = '507f1f77bcf86cd799439101';
            return this;
        });

        await agent
            .post('/api/admin/login')
            .send({
                email: 'admin@sportwear.ma',
                password: 'admin123'
            })
            .expect(200);

        const response = await agent
            .post('/api/admin/products')
            .send({
                name: 'Pro Hoodie',
                price: 399,
                category: 'hoodies',
                brand: 'SportWear'
            })
            .expect(201);

        expect(response.body.name).toBe('Pro Hoodie');
        expect(response.body.price).toBe(399);
        expect(response.body.category).toBe('hoodies');
    });

    test('POST /api/users/login creates a session readable by /api/users/check', async () => {
        const agent = request.agent(app);

        jest.spyOn(User, 'findOne').mockResolvedValue({
            _id: '507f1f77bcf86cd799439099',
            firstName: 'Amine',
            lastName: 'Runner',
            email: 'amine@example.com',
            password: 'hashed-password'
        });
        jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);

        const loginResponse = await agent
            .post('/api/users/login')
            .send({
                email: 'amine@example.com',
                password: 'secret123'
            })
            .expect(200);

        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.user.email).toBe('amine@example.com');

        const checkResponse = await agent
            .get('/api/users/check')
            .expect(200);

        expect(checkResponse.body.loggedIn).toBe(true);
        expect(checkResponse.body.user.email).toBe('amine@example.com');
        expect(checkResponse.body.user.name).toBe('Amine Runner');
    });

    test('POST /api/users/login rejects an incorrect password', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue({
            _id: '507f1f77bcf86cd799439102',
            firstName: 'Amine',
            lastName: 'Runner',
            email: 'amine@example.com',
            password: 'hashed-password'
        });
        jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false);

        const response = await request(app)
            .post('/api/users/login')
            .send({
                email: 'amine@example.com',
                password: 'wrong-password'
            })
            .expect(401);

        expect(response.body.error).toMatch(/incorrect/i);
    });

    test('POST /api/users/logout clears the user session', async () => {
        const agent = request.agent(app);

        jest.spyOn(User, 'findOne').mockResolvedValue(null);
        jest.spyOn(User.prototype, 'save').mockImplementation(async function saveMock() {
            this._id = '507f1f77bcf86cd799439100';
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

        await agent
            .post('/api/users/logout')
            .expect(200);

        const checkResponse = await agent
            .get('/api/users/check')
            .expect(200);

        expect(checkResponse.body.loggedIn).toBe(false);
    });

    test('GET /api/users/profile rejects anonymous users', async () => {
        const response = await request(app)
            .get('/api/users/profile')
            .expect(401);

        expect(response.body.error).toMatch(/non autoris/i);
    });

    test('GET /api/users/profile returns the logged-in user profile', async () => {
        const agent = request.agent(app);
        const userProfile = {
            _id: '507f1f77bcf86cd799439103',
            firstName: 'Sara',
            lastName: 'Fit',
            email: 'sara@example.com',
            phone: '0600000000',
            orders: []
        };

        jest.spyOn(User, 'findOne').mockResolvedValue(null);
        jest.spyOn(User.prototype, 'save').mockImplementation(async function saveMock() {
            this._id = userProfile._id;
            return this;
        });
        jest.spyOn(User, 'findById').mockReturnValue(mockSelectedPopulatedQuery(userProfile));

        await agent
            .post('/api/users/register')
            .send({
                firstName: 'Sara',
                lastName: 'Fit',
                email: 'sara@example.com',
                password: 'secret123',
                phone: '0600000000'
            })
            .expect(201);

        const response = await agent
            .get('/api/users/profile')
            .expect(200);

        expect(response.body.email).toBe('sara@example.com');
        expect(response.body.firstName).toBe('Sara');
    });

    test('GET /api/products returns the catalog', async () => {
        const products = [
            { _id: '507f1f77bcf86cd799439104', name: 'Training Tee', price: 199 }
        ];

        jest.spyOn(Product, 'find').mockResolvedValue(products);

        const response = await request(app)
            .get('/api/products')
            .expect(200);

        expect(response.body).toEqual(products);
    });

    test('GET /api/products/:id returns 404 when the product does not exist', async () => {
        jest.spyOn(Product, 'findById').mockResolvedValue(null);

        const response = await request(app)
            .get('/api/products/507f1f77bcf86cd799439105')
            .expect(404);

        expect(response.body.error).toMatch(/produit non trouve/i);
    });

    test('POST /api/orders creates an order for guest users', async () => {
        jest.spyOn(Order.prototype, 'save').mockImplementation(async function saveMock() {
            this._id = '507f1f77bcf86cd799439106';
            this.trackingNumber = 'SPWTEST123';
            return this;
        });

        const response = await request(app)
            .post('/api/orders')
            .send({
                items: [{ productId: 'p1', name: 'Training Tee', price: 199, quantity: 2 }],
                totalAmount: 398,
                customerEmail: 'guest@example.com'
            })
            .expect(201);

        expect(response.body.trackingNumber).toBe('SPWTEST123');
        expect(response.body.userId).toBeNull();
    });

    test('GET /api/orders/my-orders rejects anonymous users', async () => {
        const response = await request(app)
            .get('/api/orders/my-orders')
            .expect(401);

        expect(response.body.error).toMatch(/non connecte/i);
    });

    test('GET /api/orders/my-orders returns orders for the logged-in user', async () => {
        const agent = request.agent(app);
        const orders = [
            { _id: '507f1f77bcf86cd799439107', totalAmount: 398, status: 'pending' }
        ];

        jest.spyOn(User, 'findOne').mockResolvedValue(null);
        jest.spyOn(User.prototype, 'save').mockImplementation(async function saveMock() {
            this._id = '507f1f77bcf86cd799439108';
            return this;
        });
        jest.spyOn(Order, 'find').mockReturnValue(mockSortedQuery(orders));

        await agent
            .post('/api/users/register')
            .send({
                firstName: 'Nora',
                lastName: 'Move',
                email: 'nora@example.com',
                password: 'secret123'
            })
            .expect(201);

        const response = await agent
            .get('/api/orders/my-orders')
            .expect(200);

        expect(response.body).toEqual(orders);
    });

    test('GET /api/orders/track/:trackingNumber returns tracking information', async () => {
        jest.spyOn(Order, 'findOne').mockResolvedValue({
            trackingNumber: 'SPWTRACK001',
            status: 'shipped',
            statusHistory: [{ status: 'confirmed' }],
            items: [{ name: 'Training Tee', quantity: 2 }],
            totalAmount: 398,
            estimatedDelivery: '2026-04-20T00:00:00.000Z',
            createdAt: '2026-04-14T00:00:00.000Z'
        });

        const response = await request(app)
            .get('/api/orders/track/SPWTRACK001')
            .expect(200);

        expect(response.body.trackingNumber).toBe('SPWTRACK001');
        expect(response.body.status).toBe('shipped');
        expect(response.body.items).toEqual([{ name: 'Training Tee', quantity: 2 }]);
    });

    test('GET /api/reviews/:productId returns aggregate review data', async () => {
        const reviews = [
            { rating: 4, comment: 'Good' },
            { rating: 5, comment: 'Excellent' }
        ];

        jest.spyOn(Review, 'find').mockReturnValue(mockSortedQuery(reviews));

        const response = await request(app)
            .get('/api/reviews/507f1f77bcf86cd799439109')
            .expect(200);

        expect(response.body.totalReviews).toBe(2);
        expect(response.body.averageRating).toBe(4.5);
        expect(response.body.reviews).toEqual(reviews);
    });

    test('POST /api/reviews rejects duplicate reviews from the same user', async () => {
        const agent = request.agent(app);

        jest.spyOn(User, 'findOne').mockResolvedValue(null);
        jest.spyOn(User.prototype, 'save').mockImplementation(async function saveMock() {
            this._id = '507f1f77bcf86cd799439110';
            return this;
        });
        jest.spyOn(Review, 'findOne').mockResolvedValue({
            _id: '507f1f77bcf86cd799439111'
        });

        await agent
            .post('/api/users/register')
            .send({
                firstName: 'Lina',
                lastName: 'Flex',
                email: 'lina@example.com',
                password: 'secret123'
            })
            .expect(201);

        const response = await agent
            .post('/api/reviews')
            .send({
                productId: '507f1f77bcf86cd799439112',
                rating: 5,
                comment: 'Excellent produit'
            })
            .expect(400);

        expect(response.body.error).toMatch(/deja laisse un avis/i);
    });

    test('POST /api/reviews/:id/helpful increments the helpful counter', async () => {
        jest.spyOn(Review, 'findByIdAndUpdate').mockResolvedValue({
            _id: '507f1f77bcf86cd799439113',
            helpful: 3
        });

        const response = await request(app)
            .post('/api/reviews/507f1f77bcf86cd799439113/helpful')
            .expect(200);

        expect(response.body.helpful).toBe(3);
    });
});
