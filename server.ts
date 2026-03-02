import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("gasification.db");

const normalizePhone = (phone: string) => {
  if (!phone) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
      return '7' + digits.substring(1);
    }
    return digits;
  }
  return phone;
};

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE,
    password TEXT,
    role TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    client_login TEXT,
    installer_login TEXT,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT,
    date TEXT,
    status TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    url TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    sender_login TEXT,
    text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );
`);

// Migration: Add missing columns to projects table
const tableInfo = db.prepare("PRAGMA table_info(projects)").all() as any[];
const columns = tableInfo.map(c => c.name);

if (!columns.includes('designer_login')) {
  db.exec("ALTER TABLE projects ADD COLUMN designer_login TEXT");
}
if (!columns.includes('deadline')) {
  db.exec("ALTER TABLE projects ADD COLUMN deadline TEXT");
}

// Seed initial data if empty
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (login, password, role) VALUES (?, ?, ?)").run("adm", "aass", "admin");
  db.prepare("INSERT INTO users (login, password, role) VALUES (?, ?, ?)").run("test", "test", "client");
  db.prepare("INSERT INTO users (login, password, role) VALUES (?, ?, ?)").run("worker", "worker", "installer");

  const stmt = db.prepare("INSERT INTO projects (name, client_login, installer_login, deadline) VALUES (?, ?, ?, ?)");
  const info = stmt.run("ул. Ленина, д. 45", "test", "worker", "2026-04-01T00:00:00Z");
  const projectId = info.lastInsertRowid;

  db.prepare("INSERT INTO stages (project_id, name, date, status) VALUES (?, ?, ?, ?)").run(projectId, "Проектирование", "12.10.2023", "ok");
  db.prepare("INSERT INTO stages (project_id, name, date, status) VALUES (?, ?, ?, ?)").run(projectId, "Монтаж оборудования", "План: 25.11.2023", "process");
  
  db.prepare("INSERT INTO media (project_id, url) VALUES (?, ?)").run(projectId, "https://images.unsplash.com/photo-1581094288338-2314dddb7e8c?w=300");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.post("/api/login", (req, res) => {
    try {
      const { login, password } = req.body;
      const normalizedLogin = normalizePhone(login);
      const user = db.prepare("SELECT * FROM users WHERE login = ? AND password = ?").get(normalizedLogin, password) as any;
      if (user) {
        res.json({ success: true, user: { login: user.login, role: user.role } });
      } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  app.post("/api/register", (req, res) => {
    const { login, password, role } = req.body;
    try {
      const normalizedLogin = normalizePhone(login);
      db.prepare("INSERT INTO users (login, password, role) VALUES (?, ?, ?)").run(normalizedLogin, password, role);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message || "User already exists" });
    }
  });

  app.get("/api/projects", (req, res) => {
    try {
      const { login, role } = req.query;
      const normalizedLogin = normalizePhone(login as string);
      let projects;
      if (role === 'admin') {
        projects = db.prepare(`
          SELECT p.*, (SELECT COUNT(*) FROM messages WHERE project_id = p.id) as message_count 
          FROM projects p
          ORDER BY p.id DESC
        `).all();
      } else if (role === 'client') {
        projects = db.prepare(`
          SELECT p.*, (SELECT COUNT(*) FROM messages WHERE project_id = p.id) as message_count 
          FROM projects p WHERE client_login = ?
          ORDER BY p.id DESC
        `).all(normalizedLogin);
      } else if (role === 'designer') {
        projects = db.prepare(`
          SELECT p.*, (SELECT COUNT(*) FROM messages WHERE project_id = p.id) as message_count 
          FROM projects p WHERE designer_login = ?
          ORDER BY p.id DESC
        `).all(normalizedLogin);
      } else {
        projects = db.prepare(`
          SELECT p.*, (SELECT COUNT(*) FROM messages WHERE project_id = p.id) as message_count 
          FROM projects p WHERE installer_login = ?
          ORDER BY p.id DESC
        `).all(normalizedLogin);
      }
      res.json(projects);
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  app.get("/api/projects/:id", (req, res) => {
    try {
      const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
      const stages = db.prepare("SELECT * FROM stages WHERE project_id = ?").all(req.params.id);
      const media = db.prepare("SELECT * FROM media WHERE project_id = ?").all(req.params.id);
      const messages = db.prepare("SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC").all(req.params.id);
      res.json({ ...project, stages, media, messages });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  app.post("/api/projects", (req, res) => {
    try {
      const { name, client_login, installer_login, designer_login, deadline, stage1_date, stage2_date } = req.body;
      const nClient = normalizePhone(client_login);
      const nInstaller = normalizePhone(installer_login);
      const nDesigner = normalizePhone(designer_login);
      
      const info = db.prepare("INSERT INTO projects (name, client_login, installer_login, designer_login, deadline) VALUES (?, ?, ?, ?, ?)").run(name, nClient, nInstaller, nDesigner, deadline);
      const projectId = info.lastInsertRowid;
      
      db.prepare("INSERT INTO stages (project_id, name, date, status) VALUES (?, ?, ?, ?)").run(projectId, "Монтаж", stage1_date || "В планах", "wait");
      db.prepare("INSERT INTO stages (project_id, name, date, status) VALUES (?, ?, ?, ?)").run(projectId, "Документация", stage2_date || "В планах", "wait");
      
      res.json({ id: projectId });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  app.post("/api/projects/:id/media", (req, res) => {
    try {
      const { url } = req.body;
      db.prepare("INSERT INTO media (project_id, url) VALUES (?, ?)").run(req.params.id, url);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  app.post("/api/projects/:id/messages", (req, res) => {
    try {
      const { sender_login, text } = req.body;
      db.prepare("INSERT INTO messages (project_id, sender_login, text) VALUES (?, ?, ?)").run(req.params.id, sender_login, text);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  app.patch("/api/projects/:id", (req, res) => {
    try {
      const { client_login, installer_login, designer_login } = req.body;
      const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id) as any;
      
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      const nClient = client_login ? normalizePhone(client_login) : project.client_login;
      const nInstaller = installer_login ? normalizePhone(installer_login) : project.installer_login;
      const nDesigner = designer_login ? normalizePhone(designer_login) : project.designer_login;

      db.prepare("UPDATE projects SET client_login = ?, installer_login = ?, designer_login = ? WHERE id = ?")
        .run(nClient, nInstaller, nDesigner, req.params.id);
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
