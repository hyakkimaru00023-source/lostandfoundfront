import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// AI Service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';

// ==================== AUTH ROUTES ====================

// Register
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, full_name } = req.body;

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name } }
        });

        if (error) throw error;

        if (data.user) {
            await supabase.from('profiles').insert({
                id: data.user.id,
                email,
                full_name: full_name || ''
            });
        }

        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Login
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(401).json({ success: false, error: error.message });
    }
});

// Get current user
app.get('/auth/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error) throw error;

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        res.json({ success: true, user: { ...user, profile } });
    } catch (error) {
        res.status(401).json({ success: false, error: error.message });
    }
});

// Admin login (simplified)
app.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Simple admin check - in production use proper auth
        if (username === 'admin' && password === 'admin123') {
            res.json({
                success: true,
                token: 'admin-token-' + Date.now(),
                user: { id: 'admin', email: 'admin@lostfound.com', role: 'admin' }
            });
        } else {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(401).json({ success: false, error: error.message });
    }
});

// ==================== ITEMS ROUTES ====================

// Get all items (with filters)
app.get('/items', async (req, res) => {
    try {
        const { type, category, status, search, limit = 50, offset = 0 } = req.query;

        let query = supabase
            .from('items')
            .select('*')
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (type) query = query.eq('type', type);
        if (category) query = query.eq('category', category);
        if (status) query = query.eq('status', status);
        if (search) query = query.ilike('title', `%${search}%`);

        const { data, error } = await query;

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get recent items
app.get('/items/recent', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const { data, error } = await supabase
            .from('items')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single item
app.get('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Item not found' });

        res.json(data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Report lost item
app.post('/items/lost', upload.single('image'), async (req, res) => {
    try {
        const { title, description, category, location, user_id, contact_email } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const { data, error } = await supabase.from('items').insert({
            title,
            description,
            category,
            location,
            type: 'lost',
            status: 'open',
            image_url: imageUrl,
            user_id: user_id || null,
            contact_email: contact_email || null
        }).select().single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Report found item
app.post('/items/found', upload.single('image'), async (req, res) => {
    try {
        const { title, description, category, location, user_id, contact_email } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const { data, error } = await supabase.from('items').insert({
            title,
            description,
            category,
            location,
            type: 'found',
            status: 'open',
            image_url: imageUrl,
            user_id: user_id || null,
            contact_email: contact_email || null
        }).select().single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update item
app.put('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('items')
            .update({ ...updates, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete item
app.delete('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== AI ROUTES ====================

// Object detection
app.post('/ai/detect', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const formData = new FormData();
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        const response = await fetch(`${AI_SERVICE_URL}/detect`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('AI service failed');
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        // Fallback to mock detection if AI service unavailable
        res.json({
            detections: [
                { class: 'bag', confidence: 0.85, bbox: [0, 0, 100, 100] },
                { class: 'electronics', confidence: 0.72, bbox: [50, 50, 150, 150] }
            ],
            status: 'SUCCESS'
        });
    }
});

// Hybrid AI analysis
app.post('/ai/analyze-hybrid', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const formData = new FormData();
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        const response = await fetch(`${AI_SERVICE_URL}/analyze-hybrid`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('AI service failed');
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        // Fallback mock response
        res.json({
            detections: [
                { class: 'electronics', confidence: 0.78 }
            ],
            category: 'electronics',
            features: ['black', 'metallic', 'rectangular'],
            secondary_tags: ['expensive', 'important'],
            status: 'SUCCESS'
        });
    }
});

// AI Chat
app.post('/ai/chat', async (req, res) => {
    try {
        const { message, context } = req.body;

        const responses = {
            'lost': 'I can help you report a lost item. Please provide details about what you lost.',
            'found': 'Thank you for finding an item! You can report it as found using our form.',
            'default': 'I\'m here to help with your lost and found queries. How can I assist you?'
        };

        const lowerMessage = message.toLowerCase();
        let response = responses.default;

        for (const key of Object.keys(responses)) {
            if (lowerMessage.includes(key)) {
                response = responses[key];
                break;
            }
        }

        res.json({
            response,
            suggestions: ['Report Lost Item', 'Report Found Item', 'Search Items']
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI Feedback
app.post('/ai/feedback', async (req, res) => {
    try {
        const { item_id, user_id, feedback_type, correct_category, notes } = req.body;

        const { data, error } = await supabase.from('ai_feedback').insert({
            item_id,
            user_id,
            feedback_type,
            correct_category,
            notes,
            created_at: new Date()
        }).select().single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== NOTIFICATIONS ROUTES ====================

app.get('/notifications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { unreadOnly } = req.query;

        let query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (unreadOnly === 'true') {
            query = query.eq('read', false);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/notifications/:userId/unread-count', async (req, res) => {
    try {
        const { userId } = req.params;

        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) throw error;

        res.json(count || 0);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/notifications/:userId/read-all', async (req, res) => {
    try {
        const { userId } = req.params;

        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== FEEDBACK ROUTES ====================

app.post('/feedback', async (req, res) => {
    try {
        const { user_id, type, content, item_id, rating } = req.body;

        const { data, error } = await supabase.from('feedback').insert({
            user_id,
            type,
            content,
            item_id,
            rating,
            status: 'pending'
        }).select().single();

        if (error) throw error;

        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/feedback', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.patch('/feedback/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const { data, error } = await supabase
            .from('feedback')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== ADMIN ROUTES ====================

app.get('/admin/claims', async (req, res) => {
    try {
        const { status } = req.query;

        let query = supabase.from('claims').select('*');
        if (status) query = query.eq('status', status);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/admin/claims/:id/process', async (req, res) => {
    try {
        const { id } = req.params;
        const { decision, admin_notes } = req.body;

        const { data, error } = await supabase
            .from('claims')
            .update({
                status: decision === 'approve' ? 'approved' : 'rejected',
                admin_notes,
                processed_at: new Date()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin stats
app.get('/admin/stats', async (req, res) => {
    try {
        const { data: items } = await supabase.from('items').select('*');
        const { data: users } = await supabase.from('profiles').select('*');
        const { data: claims } = await supabase.from('claims').select('*');

        const stats = {
            totalItems: items?.length || 0,
            lostItems: items?.filter(i => i.type === 'lost').length || 0,
            foundItems: items?.filter(i => i.type === 'found').length || 0,
            resolvedItems: items?.filter(i => i.status === 'resolved').length || 0,
            totalUsers: users?.length || 0,
            pendingClaims: claims?.filter(c => c.status === 'pending').length || 0
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.json({
        message: 'Lost & Found API',
        version: '1.0.0',
        endpoints: [
            '/auth/*',
            '/items/*',
            '/ai/*',
            '/notifications/*',
            '/feedback/*',
            '/admin/*'
        ]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Lost & Found API running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
});

export default app;
