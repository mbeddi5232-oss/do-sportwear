require('dotenv').config();  // ✅ Load .env FIRST!

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Test if env vars are loaded
console.log('🔧 Environment Check:');
console.log('   PORT:', process.env.PORT || 'using default 3000');
console.log('   MongoDB:', process.env.MONGODB_URI ?  '✅' : '❌');
console.log('   Stripe Key:', process.env.STRIPE_SECRET_KEY ? '✅ Loaded' : '❌ Missing');

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express. json());
app.use(cookieParser());
app.use(express.static('public'));

// Session middleware
app.use(session({
    secret: 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console. log('✅ MongoDB connecté'))
    .catch(err => console.error('❌ Erreur MongoDB:', err));

// Product Schema
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
// Order Schema
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types. ObjectId, ref: 'User' }, // ADD THIS LINE
    items: [{
        productId: String,
        name: String,
        price: Number,
        quantity: Number,
        img: String
    }],
    totalAmount: Number,
    customerEmail: String,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
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

// ==================== ADMIN CREDENTIALS ====================
// In production, store hashed passwords in database
const ADMIN_USERS = [
    {
        id: 1,
        email: 'admin@sportwear.ma',
        password: '$2b$10$nlGIdrgVmTEOrmD7dfzGqOk6pCmuGKCkzBkIFf03NH6bKRRUcxJHq',
        name: 'Admin Principal',
        role: 'super_admin'
    },
    {
        id: 2,
        email: 'moderator@sportwear.ma',
        password: '$2b$10$nlGIdrgVmTEOrmD7dfzGqOk6pCmuGKCkzBkIFf03NH6bKRRUcxJHq',
        name: 'Modérateur',
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
    res.status(403). json({ error: 'Accès refusé. Droits super admin requis.' });
}

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/admin/login', async (req, res) => {
    const { email, password, rememberMe } = req.body;

    try {
        // Find user
        const user = ADMIN_USERS.find(u => u.email === email);
        
        if (!user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Check password
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401). json({ error: 'Email ou mot de passe incorrect' });
        }

        // Set session
        req.session.adminId = user.id;
        req.session.adminEmail = user.email;
        req.session.adminName = user.name;
        req.session.adminRole = user. role;

        // Extend cookie duration if "remember me"
        if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }

        res.json({
            success: true,
            admin: {
                id: user. id,
                email: user. email,
                name: user. name,
                role: user. role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res. status(500).json({ error: 'Erreur serveur' });
    }
});

// Check if logged in
app.get('/api/admin/check', (req, res) => {
    if (req.session && req.session.adminId) {
        const user = ADMIN_USERS.find(u => u.id === req.session.adminId);
        res.json({
            loggedIn: true,
            admin: {
                id: user. id,
                email: user. email,
                name: user. name,
                role: user. role
            }
        });
    } else {
        res. json({ loggedIn: false });
    }
});

// Logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
        }
        res. clearCookie('connect.sid');
        res.json({ success: true, message: 'Déconnecté avec succès' });
    });
});

// ==================== PROTECTED ADMIN ROUTES ====================

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
        const product = await Product.findByIdAndUpdate(req.params. id, req.body, { new: true });
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
        const product = await Product.findByIdAndDelete(req.params. id);
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }
        res. json({ success: true, message: 'Produit supprimé' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all orders
app.get('/api/admin/orders', isAuthenticated, async (req, res) => {
    try {
        const orders = await Order.find(). sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error. message });
    }
});

// Update order status
app.put('/api/admin/orders/:id', isAuthenticated, async (req, res) => {
    try {
        const order = await Order. findByIdAndUpdate(
            req.params.id,
            { status: req.body. status },
            { new: true }
        );
        if (! order) {
            return res. status(404).json({ error: 'Commande non trouvée' });
        }
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// ==================== USER AUTH ROUTES ====================

// User Registration
app.post('/api/users/register', async (req, res) => {
    const { firstName, lastName, email, password, phone, address } = req. body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: email. toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Validate password
        if (! password || password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
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
        req.session.userName = `${user.firstName} ${user. lastName}`;

        res.status(201).json({
            success: true,
            user: {
                id: user._id,
                firstName: user. firstName,
                lastName: user. lastName,
                email: user. email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res. status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
});

// User Login
app. post('/api/users/login', async (req, res) => {
    const { email, password, rememberMe } = req.body;

    try {
        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Check password
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401). json({ error: 'Email ou mot de passe incorrect' });
        }

        // Create session
        req.session.userId = user._id;
        req.session.userEmail = user.email;
        req.session.userName = `${user.firstName} ${user.lastName}`;

        // Extend cookie if remember me
        if (rememberMe) {
            req.session. cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
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

    } catch (error) {
        console.error('Login error:', error);
        res. status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

// Check if user is logged in
app.get('/api/users/check', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            loggedIn: true,
            user: {
                id: req. session.userId,
                email: req.session.userEmail,
                name: req.session.userName
            }
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// User Logout
app.post('/api/users/logout', (req, res) => {
    req. session.destroy((err) => {
        if (err) {
            return res.status(500). json({ error: 'Erreur lors de la déconnexion' });
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

// Update user profile
app. put('/api/users/profile', async (req, res) => {
    if (!req.session || ! req.session.userId) {
        return res.status(401). json({ error: 'Non autorisé' });
    }

    try {
        const { firstName, lastName, phone, address } = req.body;

        const user = await User.findByIdAndUpdate(
            req.session.userId,
            { firstName, lastName, phone, address },
            { new: true, select: '-password' }
        );

        if (!user) {
            return res.status(404). json({ error: 'Utilisateur non trouvé' });
        }

        // Update session name
        req.session.userName = `${user.firstName} ${user.lastName}`;

        res. json({ success: true, user });

    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// Get user orders
app.get('/api/users/orders', async (req, res) => {
    if (! req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Non autorisé' });
    }

    try {
        const orders = await Order. find({ userId: req.session. userId })
            .sort({ createdAt: -1 });

        res.json(orders);

    } catch (error) {
        console.error('Orders error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
// ==================== PUBLIC ROUTES ====================

// Get products (public)
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500). json({ error: error.message });
    }
});

// Create order (from checkout)
// Create order (from checkout) - UPDATE THIS
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = {
            ... req.body,
            userId: req.session?. userId || null // Save user ID if logged in
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

// Stripe checkout (keep your existing code)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/create-checkout-session', async (req, res) => {
    const { cart } = req.body;

    console.log('📦 Received cart:', JSON.stringify(cart, null, 2));

    // Validate cart
    if (!cart || cart. length === 0) {
        console.log('❌ Cart is empty');
        return res.status(400).json({ error: 'Le panier est vide' });
    }

    try {
        // Build line items with validation
        const lineItems = cart. map((item, index) => {
            console.log(`\n🔍 Processing item ${index}:`, item);

            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.qty) || 1;

            console.log(`   Price: ${price}, Quantity: ${quantity}`);

            // Build product data
            const productData = {
                name: item.name || 'Produit Sans Nom'
            };

            // Only add description if it exists
            if (item.brand && String(item.brand).trim() !== '') {
                productData.description = String(item.brand);
            }

            console.log('   Product data:', productData);

            return {
                price_data: {
                    currency: 'mad',
                    product_data: productData,
                    unit_amount: Math.round(price * 100)
                },
                quantity: quantity
            };
        });

        console.log('\n📋 Final line items:', JSON.stringify(lineItems, null, 2));

        // Create Stripe session
        console.log('🔄 Calling Stripe API...');
        
        const session = await stripe.checkout.sessions. create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `http://localhost:3000/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `http://localhost:3000/cancel.html`,
});

        console.log('✅ Stripe session created successfully!');
        console.log('   Session ID:', session.id);
        console.log('   Payment URL:', session.url);

        if (! session.url) {
            throw new Error('Stripe did not return a checkout URL');
        }

        res.json({ url: session.url });

    } catch (error) {
        console.error('\n❌ STRIPE ERROR:');
        console.error('   Message:', error.message);
        console.error('   Type:', error.type);
        console.error('   Code:', error. code);
        console.error('   Full error:', error);
        
        res.status(500).json({ 
            error: error.message || 'Erreur Stripe'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});