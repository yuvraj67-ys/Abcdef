const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const { removeBackground } = require('@imgly/background-removal-node');

const app = express();
app.use(cors());

// Image ko memory mein store karne ke liye
const upload = multer({ storage: multer.memoryStorage() });

// ---------------------------------------------------------
// TOOL 1: AI Background Remover API
// ---------------------------------------------------------
app.post('/api/remove-bg', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Image upload karein' });

        // Buffer ko Blob mein convert karna (Imgly library ke liye zaruri hai)
        const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
        
        // AI background remove process
        const imageWithNoBg = await removeBackground(blob);
        const arrayBuffer = await imageWithNoBg.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;
        res.json({ success: true, result_image: base64Image });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Background remove karne mein error aaya' });
    }
});

// ---------------------------------------------------------
// TOOL 2: Image Compressor API (Convert to WebP)
// ---------------------------------------------------------
app.post('/api/compress', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Image upload karein' });

        // Sharp se image compress karna
        const compressedBuffer = await sharp(req.file.buffer)
            .webp({ quality: 50 }) // 50% quality for small size
            .toBuffer();

        const base64Image = `data:image/webp;base64,${compressedBuffer.toString('base64')}`;
        res.json({ success: true, result_image: base64Image });
    } catch (error) {
        res.status(500).json({ error: 'Compression fail ho gayi' });
    }
});

// ---------------------------------------------------------
// TOOL 3: Image Filters (Grayscale / Blur)
// ---------------------------------------------------------
app.post('/api/filter', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Image upload karein' });
        
        const filterType = req.body.filterType; // 'grayscale' or 'blur'
        let processedImage = sharp(req.file.buffer);

        if (filterType === 'grayscale') {
            processedImage = processedImage.grayscale();
        } else if (filterType === 'blur') {
            processedImage = processedImage.blur(10);
        }

        const outputBuffer = await processedImage.jpeg().toBuffer();
        const base64Image = `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;
        res.json({ success: true, result_image: base64Image });
    } catch (error) {
        res.status(500).json({ error: 'Filter lagane mein error aaya' });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 All-in-One Image API running on port ${PORT}`);
});
