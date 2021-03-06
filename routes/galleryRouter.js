import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { models } from '../models';
import sharp from 'sharp';
import fs from 'fs';

export const galleryRouter = Router();

const { Images } = models;

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, '/home/basile/react/labs/backend/tmp');
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (
      ext !== '.jpg' &&
      ext !== '.jpeg' &&
      ext !== '.png' &&
      ext !== '.webp'
    ) {
      cb(new Error('File type is not supported'), false);
      return;
    }
    cb(null, true);
  },
});

galleryRouter.get('/', async (req, res) => {
  try {
    const images = await Images.findAll();
    res.json(images);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

galleryRouter.post('/', upload.array('images', 7), async (req, res) => {
  const overlay = `<svg width="${500}" height="${30}">
    <text x="50%" y="50%" font-family="sans-serif" font-size="16" text-anchor="middle">${new Date()}</text>
  </svg>`;
  const files = req.files;
  try {
    const thumbsPromises = files.map((file) =>
      sharp(file.path)
        .resize(150, 150, { fit: 'fill' })
        .toFile('tmp/thumbs/' + 'thumb-' + file.filename)
    );
    const thumbsImages = await Promise.all(thumbsPromises);
    const dateImages = files.map((file) => {
      sharp(file.path)
        .composite([{ input: Buffer.from(overlay), gravity: 'south' }])
        .toBuffer((err, buffer) => {
          fs.writeFile(file.path, buffer, (err) => {
            console.log(err);
          });
        });
    });
    Promise.all(dateImages);
    const imagesPromises = files.map((file, ind) =>
      Images.create({
        filename: file.originalname,
        url: file.filename,
        thumb_url: `thumbs/thumb-${file.filename}`,
      })
    );
    const images = await Promise.all(imagesPromises);
    res.json({ images });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

galleryRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;
  try {
    await Images.update({ description }, { where: { id } });
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

galleryRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Images.destroy({ where: { id } });
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});
