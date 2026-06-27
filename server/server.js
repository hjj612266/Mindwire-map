const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4010;
const MAPS_DIR = path.join(__dirname, '..', 'maps');
const FRONTEND_DIR = path.join(__dirname, '..');

app.use(express.json());

if (!fs.existsSync(MAPS_DIR)) {
  fs.mkdirSync(MAPS_DIR, { recursive: true });
}

app.use(express.static(FRONTEND_DIR));

function getMapPath(id) {
  return path.join(MAPS_DIR, `${id}.mwm`);
}

app.get('/api/maps', (req, res) => {
  try {
    const files = fs.readdirSync(MAPS_DIR).filter(f => f.endsWith('.mwm'));
    const maps = files.map(f => {
      const filePath = path.join(MAPS_DIR, f);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return { id: data.id, name: data.name, createdAt: data.createdAt, updatedAt: data.updatedAt, cardCount: (data.cards || []).length };
      } catch {
        return null;
      }
    }).filter(Boolean);
    res.json({ ok: true, maps });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/maps', (req, res) => {
  try {
    const { name } = req.body;
    const files = fs.readdirSync(MAPS_DIR).filter(f => f.endsWith('.mwm'));
    const maxId = files.reduce((max, f) => Math.max(max, parseInt(f.replace('.mwm', '')) || 0), 0);
    const now = new Date().toISOString();
    const map = { id: maxId + 1, name: name || '新画布', createdAt: now, updatedAt: now, cards: [], connections: [], settings: {} };
    fs.writeFileSync(getMapPath(map.id), JSON.stringify(map, null, 2));
    res.json({ ok: true, map });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/maps/:id', (req, res) => {
  try {
    const filePath = getMapPath(req.params.id);
    if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: 'not found' });
    const map = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json({ ok: true, map });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.put('/api/maps/:id', (req, res) => {
  try {
    const filePath = getMapPath(req.params.id);
    if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: 'not found' });
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const updated = { ...existing, ...req.body, id: parseInt(req.params.id), updatedAt: new Date().toISOString() };
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    res.json({ ok: true, map: updated });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete('/api/maps/:id', (req, res) => {
  try {
    const filePath = getMapPath(req.params.id);
    if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: 'not found' });
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Mindwire server running at http://localhost:${PORT}`);
});
