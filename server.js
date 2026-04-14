require('dotenv').config();  

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const isTestEnv = process.env.NODE_ENV === 'test';

// env check
if (!process.env.MONGODB_URI) console.warn('MONGODB_URI not set');
if (!process.env.SESSION_SECRET) console.warn('SESSION_SECRET not set');

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rate limiting for login endpoints
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Trop de tentatives de connexion, réessayez plus tard',
    skip: () => process.env.NODE_ENV === 'test',
    standardHeaders: false,
    legacyHeaders: false
});

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

if (!isTestEnv) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('MongoDB connected'))
        .catch(err => {
            console.error('MongoDB error:', err.message);
            process.exit(1);
        });

    mongoose.connection.on('error', (err) => {
        console.error('MongoDB error:', err);
    });
}


const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    img: String,
    category: String,
    brand: String,
    badge: String,
    description: String,
    stock: { type: Number, default: 100 }
});

const Product = mongoose.model('Product', productSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    trackingNumber: { type: String, unique: true },
    items: [{
        productId: String,
        name: String,
        price: Number,
        quantity: Number,
        img: String
    }],
    totalAmount: Number,
    customerEmail: String,
    customerPhone: String,
    shippingAddress: {
        street: String,
        city: String,
        postalCode: String,
        country: { type: String, default: 'Maroc' }
    },
    status: { type: String, default: 'pending', enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] },
    statusHistory: [{
        status: String,
        date: { type: Date, default: Date.now },
        note: String
    }],
    estimatedDelivery: Date,
    createdAt: { type: Date, default: Date.now }
});

// Generate tracking number before save
orderSchema.pre('save', function(next) {
    if (!this.trackingNumber) {
        this.trackingNumber = 'SPW' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    }
    next();
});
// User Schema
const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String },
    address: {
        street: String,
        city: String,
        postalCode: String,
        country: { type: String, default: 'Maroc' }
    },
    orders: [{ type: mongoose.Schema.Types. ObjectId, ref: 'Order' }],
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);

// Review Schema
const reviewSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String },
    comment: { type: String, required: true },
    verified: { type: Boolean, default: false },
    helpful: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);

// admin accounts (password: admin123)
const ADMIN_USERS = [
    {
        id: 1,
        email: 'admin@sportwear.ma',
        password: '$2b$10$0cWgR.j6OEvs7lNDDgKa6Oo1K/DXDO8OTJm7y89Ei7XFa1BUcCmO2',
        name: 'Admin Principal',
        role: 'super_admin'
    },
    {
        id: 2,
        email: 'moderator@sportwear.ma',
        password: '$2b$10$0cWgR.j6OEvs7lNDDgKa6Oo1K/DXDO8OTJm7y89Ei7XFa1BUcCmO2',
        name: 'Moderateur',
        role: 'moderator'
    }
];

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.adminId) {
        return next();
    }
    res.status(401).json({ error: 'Non autorisé.  Veuillez vous connecter.' });
}

// Middleware to check if user is super admin
function isSuperAdmin(req, res, next) {
    if (req.session && req.session.adminRole === 'super_admin') {
        return next();
    }
    res.status(403).json({ error: 'Accès refusé. Droits super admin requis.' });
}

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/admin/login', loginLimiter, async (req, res) => {
    const { email, password, rememberMe } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    try {
        // Find user
        const user = ADMIN_USERS.find(u => u.email === email);
        
        if (!user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Check password
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Set session
        req.session.adminId = user.id;
        req.session.adminEmail = user.email;
        req.session.adminName = user.name;
        req.session.adminRole = user.role;

        if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        }

        res.json({
            success: true,
            admin: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Check if logged in
app.get('/api/admin/check', (req, res) => {
    if (req.session && req.session.adminId) {
        const user = ADMIN_USERS.find(u => u.id === req.session.adminId);
        res.json({
            loggedIn: true,
            admin: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// Logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Déconnecté avec succès' });
    });
});

// admin routes

// Get all products (admin)
app.get('/api/admin/products', isAuthenticated, async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add product (super admin only)
app.post('/api/admin/products', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        // Validate required fields
        const { name, price, category} = req.body;
        if (!name || !price || !category) {
            return res.status(400).json({ error: 'Nom, prix et catégorie requis' });
        }
        if (price < 0) {
            return res.status(400).json({ error: 'Le prix doit être positif' });
        }

        const product = new Product(req.body);
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update product
app.put('/api/admin/products/:id', isAuthenticated, async (req, res) => {
    try {
        // Validate data if price is being updated
        if (req.body.price !== undefined && req.body.price < 0) {
            return res.status(400).json({ error: 'Le prix doit être positif' });
        }

        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }
        res.json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete product (super admin only)
app.delete('/api/admin/products/:id', isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }
        res.json({ success: true, message: 'Produit supprimé' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get dashboard stats - REAL DATA
app.get('/api/admin/stats', isAuthenticated, async (req, res) => {
    try {
        // Get total revenue from orders (excluding cancelled)
        const revenueResult = await Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const revenue = revenueResult[0]?.total || 0;

        // Get total orders count
        const ordersCount = await Order.countDocuments();

        // Get customers count
        const customersCount = await User.countDocuments();

        // Get products count
        const productsCount = await Product.countDocuments();

        // Get recent orders for activity
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('trackingNumber totalAmount status createdAt items customerEmail');

        // Get recent users
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(3)
            .select('firstName lastName city createdAt');

        // Monthly revenue for chart (last 12 months)
        const monthlyRevenue = await Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    total: { $sum: '$totalAmount' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        res.json({
            revenue,
            ordersCount,
            customersCount,
            productsCount,
            recentOrders,
            recentUsers,
            monthlyRevenue
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all orders
app.get('/api/admin/orders', isAuthenticated, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update order status
app.put('/api/admin/orders/:id', isAuthenticated, async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        if (!order) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// user routes

app.post('/api/users/register', async (req, res) => {
    const { firstName, lastName, email, password, phone, address } = req.body;

    try {
        // Validate required fields
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'Prenom, nom, email et mot de passe requis' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Format email invalide' });
        }
        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est deja utilise' });
        }

        // Validate password
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caracteres' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password: hashedPassword,
            phone,
            address
        });

        await user.save();

        // Create session
        req.session.userId = user._id;
        req.session.userEmail = user.email;
        req.session.userName = `${user.firstName} ${user.lastName}`;

        res.status(201).json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
});

app.post('/api/users/login', loginLimiter, async (req, res) => {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        req.session.userId = user._id;
        req.session.userEmail = user.email;
        req.session.userName = `${user.firstName} ${user.lastName}`;

        if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        }
        
        req.session.save((err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Erreur de session' });
            }
            
            res.json({
                success: true,
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email
                }
            });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

app.get('/api/users/check', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            loggedIn: true,
            user: {
                id: req.session.userId,
                email: req.session.userEmail,
                name: req.session.userName
            }
        });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post('/api/users/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

// Get user profile
app.get('/api/users/profile', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Non autorisé' });
    }

    try {
        const user = await User.findById(req.session.userId)
            .select('-password')
            .populate('orders');
        
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        res.json(user);

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.put('/api/users/profile', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Non autorisé' });
    }

    try {
        const { firstName, lastName, phone, address } = req.body;

        const user = await User.findByIdAndUpdate(
            req.session.userId,
            { firstName, lastName, phone, address },
            { new: true, select: '-password' }
        );

        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        req.session.userName = `${user.firstName} ${user.lastName}`;

        res.json({ success: true, user });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

app.get('/api/users/orders', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Non autorisé' });
    }

    try {
        const orders = await Order.find({ userId: req.session.userId })
            .sort({ createdAt: -1 });

        res.json(orders);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// products

// Get products (public)
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single product by ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouve' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            userId: req.session?.userId || null
        };
        
        const order = new Order(orderData);
        await order.save();

        // If user is logged in, add order to user's orders
        if (req.session?.userId) {
            await User.findByIdAndUpdate(
                req.session.userId,
                { $push: { orders: order._id } }
            );
        }

        res.status(201).json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/create-checkout-session', async (req, res) => {
    const { cart } = req.body;

    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: 'Le panier est vide' });
    }

    try {
        const lineItems = cart.map((item) => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.qty) || 1;

            const productData = {
                name: item.name || 'Produit Sans Nom'
            };

            if (item.brand && String(item.brand).trim() !== '') {
                productData.description = String(item.brand);
            }

            return {
                price_data: {
                    currency: 'mad',
                    product_data: productData,
                    unit_amount: Math.round(price * 100)
                },
                quantity: quantity
            };
        });
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `http://localhost:3000/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `http://localhost:3000/cancel.html`,
        });

        if (!session.url) {
            throw new Error('Stripe did not return a checkout URL');
        }

        res.json({ url: session.url });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            error: error.message || 'Erreur Stripe'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date(),
        uptime: process.uptime()
    });
});

// order tracking

// Track order by tracking number
app.get('/api/orders/track/:trackingNumber', async (req, res) => {
    try {
        const order = await Order.findOne({ trackingNumber: req.params.trackingNumber });
        
        if (!order) {
            return res.status(404).json({ error: 'Commande non trouvee' });
        }
        
        res.json({
            trackingNumber: order.trackingNumber,
            status: order.status,
            statusHistory: order.statusHistory || [],
            items: order.items.map(i => ({ name: i.name, quantity: i.quantity })),
            totalAmount: order.totalAmount,
            estimatedDelivery: order.estimatedDelivery,
            createdAt: order.createdAt
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's orders (authenticated)
app.get('/api/orders/my-orders', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Non connecte' });
        }
        
        const orders = await Order.find({ userId: req.session.userId })
            .sort({ createdAt: -1 });
        
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update order status (admin only)
app.put('/api/admin/orders/:id/status', isAuthenticated, async (req, res) => {
    try {
        const { status, note } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ error: 'Commande non trouvee' });
        }
        
        order.status = status;
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({ status, note, date: new Date() });
        
        // Set estimated delivery for shipped orders
        if (status === 'shipped' && !order.estimatedDelivery) {
            order.estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
        }
        
        await order.save();
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// reviews

// Get all reviews for a product
app.get('/api/reviews/:productId', async (req, res) => {
    try {
        const reviews = await Review.find({ productId: req.params.productId })
            .sort({ createdAt: -1 });
        
        // Calculate average rating
        const avgRating = reviews.length > 0 
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
            : 0;
        
        res.json({
            reviews,
            totalReviews: reviews.length,
            averageRating: Math.round(avgRating * 10) / 10
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all reviews (for admin)
app.get('/api/admin/reviews', isAuthenticated, async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('productId', 'name')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a review (authenticated users only)
app.post('/api/reviews', async (req, res) => {
    try {
        const { productId, rating, title, comment } = req.body;
        
        // Check if user is logged in
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Vous devez etre connecte pour laisser un avis' });
        }
        
        // Validate input
        if (!productId || !rating || !comment) {
            return res.status(400).json({ error: 'Produit, note et commentaire requis' });
        }
        
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'La note doit etre entre 1 et 5' });
        }
        
        // Check if user already reviewed this product
        const existingReview = await Review.findOne({
            productId,
            userId: req.session.userId
        });
        
        if (existingReview) {
            return res.status(400).json({ error: 'Vous avez deja laisse un avis pour ce produit' });
        }
        
        const review = new Review({
            productId,
            userId: req.session.userId,
            userName: req.session.userName,
            rating,
            title,
            comment,
            verified: false
        });
        
        await review.save();
        res.status(201).json(review);
        
    } catch (error) {
        console.error('Review error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'avis' });
    }
});

// Delete a review (admin or owner)
app.delete('/api/reviews/:id', async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({ error: 'Avis non trouve' });
        }
        
        // Check if admin or owner
        const isAdmin = req.session.adminId;
        const isOwner = req.session.userId && review.userId.toString() === req.session.userId.toString();
        
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: 'Non autorise' });
        }
        
        await Review.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Avis supprime' });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark review as helpful
app.post('/api/reviews/:id/helpful', async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { $inc: { helpful: 1 } },
            { new: true }
        );
        
        if (!review) {
            return res.status(404).json({ error: 'Avis non trouve' });
        }
        
        res.json(review);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function startServer(port = PORT) {
    return app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}

if (require.main === module) {
    startServer();

    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled Rejection:', reason);
        process.exit(1);
    });
}

module.exports = {
    app,
    startServer,
    models: {
        Product,
        Order,
        User,
        Review
    },
    ADMIN_USERS
};
