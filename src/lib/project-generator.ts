import { v4 as uuidv4 } from "uuid";

export interface ProjectConfig {
  type: "frontend" | "backend" | "fullstack";
  language: "javascript" | "typescript";
  frontend?: {
    framework: "react" | "vue" | "angular" | "svelte" | "vanilla";
    styling: "css" | "scss" | "tailwind" | "bootstrap";
  };
  backend?: {
    framework: "express" | "nest" | "fastify" | "koa" | "hapi";
    database?: "mongodb" | "postgres" | "mysql" | "sqlite" | "none";
  };
  name: string;
  description?: string;
}

export interface ProjectSession {
  id: string;
  config: ProjectConfig;
  terminalPath: string;
  createdAt: Date;
}

export class ProjectGenerator {
  private static sessions: Map<string, ProjectSession> = new Map();

  static createSession(config: ProjectConfig): ProjectSession {
    // Validate config based on project type
    if (config.type === "frontend" || config.type === "fullstack") {
      if (!config.frontend) {
        throw new Error(
          "Frontend configuration is required for frontend or fullstack projects"
        );
      }
    }

    if (config.type === "backend" || config.type === "fullstack") {
      if (!config.backend) {
        throw new Error(
          "Backend configuration is required for backend or fullstack projects"
        );
      }
    }

    const sessionId = uuidv4();
    const terminalPath = `/private/tmp/term-users/${sessionId}/`;

    const session: ProjectSession = {
      id: sessionId,
      config,
      terminalPath,
      createdAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  static getSession(sessionId: string): ProjectSession | undefined {
    return this.sessions.get(sessionId);
  }

  static getAllSessions(): ProjectSession[] {
    return Array.from(this.sessions.values());
  }

  static generateInitCommands(session: ProjectSession): string[] {
    const commands: string[] = [
      `mkdir -p ${session.terminalPath}`,
      `cd ${session.terminalPath}`,
    ];

    const { config } = session;
    const { type, language, name } = config;

    if (type === "frontend" || type === "fullstack") {
      const { framework, styling } = config.frontend!;

      if (framework === "react") {
        if (language === "typescript") {
          commands.push(`npx create-react-app ${name} --template typescript`);
        } else {
          commands.push(`npx create-react-app ${name}`);
        }

        // Add cd before installing tailwind
        if (styling === "tailwind") {
          commands.push(
            `cd ${name}`,
            "npm install -D tailwindcss postcss autoprefixer",
            "npx tailwindcss init -p"
          );
        } else if (styling === "scss") {
          commands.push(`cd ${name}`, "npm install node-sass");
        } else if (styling === "bootstrap") {
          commands.push(`cd ${name}`, "npm install bootstrap");
        }
      } else if (framework === "vue") {
        // Fix Vue CLI command - can't use -d and -p flags together this way
        if (language === "typescript") {
          commands.push(
            "npm install -g @vue/cli",
            `vue create ${name} --preset typescript`
          );
        } else {
          commands.push(
            "npm install -g @vue/cli",
            `vue create ${name} --default`
          );
        }

        // Add styling packages based on selection
        if (styling !== "css") {
          commands.push(
            `cd ${name}`,
            styling === "scss"
              ? "npm install -D sass-loader sass"
              : styling === "tailwind"
              ? "npm install -D tailwindcss postcss autoprefixer"
              : styling === "bootstrap"
              ? "npm install bootstrap"
              : ""
          );
        }
      } else if (framework === "svelte") {
        commands.push(
          `npx degit sveltejs/template ${name}`,
          `cd ${name}`,
          "npm install"
        );
        if (language === "typescript") {
          commands.push("node scripts/setupTypeScript.js");
        }

        // Add styling packages
        if (styling === "tailwind") {
          commands.push("npm install -D tailwindcss postcss autoprefixer");
        } else if (styling === "scss") {
          commands.push("npm install -D svelte-preprocess sass");
        } else if (styling === "bootstrap") {
          commands.push("npm install bootstrap");
        }
      } else if (framework === "angular") {
        commands.push(
          "npm install -g @angular/cli",
          `ng new ${name} ${language === "typescript" ? "" : "--minimal"}`
        );

        if (styling !== "css") {
          commands.push(
            `cd ${name}`,
            styling === "scss"
              ? "" // Angular uses SCSS by default
              : styling === "tailwind"
              ? "npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init"
              : styling === "bootstrap"
              ? "ng add @ng-bootstrap/ng-bootstrap"
              : ""
          );
        }
      } else if (framework === "vanilla") {
        commands.push(
          `mkdir -p ${name}/src`,
          `cd ${name}`,
          "npm init -y",
          "npm install -D webpack webpack-cli webpack-dev-server html-webpack-plugin"
        );

        if (language === "typescript") {
          commands.push("npm install -D typescript ts-loader");
        }

        if (styling === "scss") {
          commands.push(
            "npm install -D sass sass-loader css-loader style-loader"
          );
        } else if (styling === "tailwind") {
          commands.push(
            "npm install -D tailwindcss postcss postcss-loader autoprefixer"
          );
        } else if (styling === "bootstrap") {
          commands.push("npm install bootstrap");
        } else {
          commands.push("npm install -D css-loader style-loader");
        }
      }
    }

    if (type === "backend" || type === "fullstack") {
      const backendDir = type === "fullstack" ? `${name}-backend` : name;
      const { framework, database } = config.backend!;

      // Make sure we're in the parent directory first
      if (type === "fullstack") {
        commands.push(`cd ${session.terminalPath}`);
      }

      commands.push(`mkdir -p ${backendDir}`);
      commands.push(`cd ${backendDir}`);
      commands.push("npm init -y");

      if (framework === "express") {
        commands.push("npm install express");
        if (language === "typescript") {
          commands.push(
            "npm install -D typescript @types/express @types/node ts-node ts-node-dev"
          );
        } else {
          commands.push("npm install -D nodemon");
        }
      } else if (framework === "nest" && language === "typescript") {
        commands.push(
          "npm i -g @nestjs/cli",
          `nest new ${backendDir} --package-manager npm`
        );
      } else if (framework === "fastify") {
        commands.push("npm install fastify");
        if (language === "typescript") {
          commands.push(
            "npm install -D typescript @types/node ts-node ts-node-dev"
          );
        } else {
          commands.push("npm install -D nodemon");
        }
      } else if (framework === "koa") {
        commands.push("npm install koa koa-router koa-bodyparser");
        if (language === "typescript") {
          commands.push(
            "npm install -D typescript @types/koa @types/koa-router @types/koa-bodyparser @types/node ts-node ts-node-dev"
          );
        } else {
          commands.push("npm install -D nodemon");
        }
      } else if (framework === "hapi") {
        commands.push("npm install @hapi/hapi");
        if (language === "typescript") {
          commands.push(
            "npm install -D typescript @types/hapi__hapi @types/node ts-node ts-node-dev"
          );
        } else {
          commands.push("npm install -D nodemon");
        }
      }

      if (database && database !== "none") {
        if (database === "mongodb") {
          commands.push("npm install mongoose");
          if (language === "typescript") {
            commands.push("npm install -D @types/mongoose");
          }
        } else if (database === "postgres") {
          commands.push("npm install pg");
          if (language === "typescript") {
            commands.push("npm install -D @types/pg");
          }
        } else if (database === "mysql") {
          commands.push("npm install mysql2");
          if (language === "typescript") {
            commands.push("npm install -D @types/mysql");
          }
        } else if (database === "sqlite") {
          commands.push("npm install sqlite3");
          if (language === "typescript") {
            commands.push("npm install -D @types/sqlite3");
          }
        }
      }

      // Create src directory
      commands.push("mkdir -p src/routes src/controllers");
    }

    return commands.filter((cmd) => cmd !== "");
  }

  static generateFileStructure(
    session: ProjectSession
  ): Record<string, string> {
    const files: Record<string, string> = {};
    const { config } = session;
    const { type, language, name } = config;

    if (type === "frontend" || type === "fullstack") {
      const { framework, styling } = config.frontend!;
      const ext = language === "typescript" ? ".ts" : ".js";
      const jsxExt = language === "typescript" ? ".tsx" : ".jsx";

      if (framework === "vanilla") {
        // Add basic files for vanilla projects
        files[`${name}/src/index.html`] = this.generateVanillaHTML(name);
        files[`${name}/src/index${ext}`] = this.generateVanillaJS(language);

        if (styling === "tailwind") {
          files[`${name}/tailwind.config.js`] = this.generateTailwindConfig();
        }

        if (language === "typescript") {
          files[`${name}/tsconfig.json`] = this.generateBasicTSConfig();
        }

        files[`${name}/webpack.config.js`] = this.generateWebpackConfig(
          language,
          styling
        );
      }
    }

    if (type === "backend" || type === "fullstack") {
      const backendDir = type === "fullstack" ? `${name}-backend` : name;
      const { framework, database } = config.backend!;
      const ext = language === "typescript" ? ".ts" : ".js";

      if (framework === "express") {
        // Main server file
        files[`${backendDir}/src/index${ext}`] = this.generateExpressServerCode(
          language,
          database
        );

        // Routes directory
        files[`${backendDir}/src/routes/index${ext}`] =
          this.generateExpressRoutesCode(language);

        // Controllers directory
        files[`${backendDir}/src/controllers/index${ext}`] =
          this.generateExpressControllersCode(language);

        if (database && database !== "none") {
          // Add database config and models
          files[`${backendDir}/src/models/index${ext}`] =
            this.generateModelCode(language, database);
          files[`${backendDir}/src/config/database${ext}`] =
            this.generateDBConfigCode(language, database);
        }

        if (language === "typescript") {
          files[`${backendDir}/tsconfig.json`] = JSON.stringify(
            {
              compilerOptions: {
                target: "es6",
                module: "commonjs",
                outDir: "./dist",
                rootDir: "./src",
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
                resolveJsonModule: true,
              },
              include: ["src/**/*"],
              exclude: ["node_modules"],
            },
            null,
            2
          );
        }

        // Package.json scripts
        files[`${backendDir}/package.json`] = JSON.stringify(
          {
            name: backendDir,
            version: "1.0.0",
            description: config.description || "Generated Express server",
            main: language === "typescript" ? "dist/index.js" : "src/index.js",
            scripts: {
              start:
                language === "typescript"
                  ? "node dist/index.js"
                  : "node src/index.js",
              dev:
                language === "typescript"
                  ? "ts-node-dev --respawn src/index.ts"
                  : "nodemon src/index.js",
              build:
                language === "typescript"
                  ? "tsc"
                  : "echo 'No build step required'",
            },
            keywords: [],
            author: "",
            license: "ISC",
          },
          null,
          2
        );
      } else if (framework === "fastify") {
        files[`${backendDir}/src/index${ext}`] = this.generateFastifyServerCode(
          language,
          database
        );
      } else if (framework === "koa") {
        files[`${backendDir}/src/index${ext}`] = this.generateKoaServerCode(
          language,
          database
        );
      } else if (framework === "hapi") {
        files[`${backendDir}/src/index${ext}`] = this.generateHapiServerCode(
          language,
          database
        );
      }
    }

    return files;
  }

  // Helper methods for generating file content

  private static generateExpressRoutesCode(
    language: "javascript" | "typescript"
  ): string {
    if (language === "typescript") {
      return `import { Router } from 'express';
  import * as controllers from '../controllers';
  
  const router = Router();
  
  // Define routes
  router.get('/items', controllers.getAllItems);
  router.get('/items/:id', controllers.getItemById);
  router.post('/items', controllers.createItem);
  router.put('/items/:id', controllers.updateItem);
  router.delete('/items/:id', controllers.deleteItem);
  
  export default router;`;
    } else {
      return `const { Router } = require('express');
  const controllers = require('../controllers');
  
  const router = Router();
  
  // Define routes
  router.get('/items', controllers.getAllItems);
  router.get('/items/:id', controllers.getItemById);
  router.post('/items', controllers.createItem);
  router.put('/items/:id', controllers.updateItem);
  router.delete('/items/:id', controllers.deleteItem);
  
  module.exports = router;`;
    }
  }

  private static generateExpressControllersCode(
    language: "javascript" | "typescript"
  ): string {
    if (language === "typescript") {
      return `import { Request, Response } from 'express';
  
  // Example controller for items
  // In a real app, you would interact with your database here
  
  export const getAllItems = async (req: Request, res: Response): Promise<void> => {
    try {
      // Demo data - replace with actual DB query
      const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      res.status(200).json({ items });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get items' });
    }
  };
  
  export const getItemById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      // Demo data - replace with actual DB query
      const item = { id, name: \`Item \${id}\` };
      res.status(200).json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get item' });
    }
  };
  
  export const createItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }
      // Demo data - replace with actual DB insert
      const newItem = { id: Date.now(), name };
      res.status(201).json(newItem);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create item' });
    }
  };
  
  export const updateItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }
      // Demo data - replace with actual DB update
      const updatedItem = { id, name };
      res.status(200).json(updatedItem);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update item' });
    }
  };
  
  export const deleteItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      // Demo data - replace with actual DB delete
      res.status(200).json({ message: \`Item \${id} deleted successfully\` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete item' });
    }
  };`;
    } else {
      return `// Example controller for items
  // In a real app, you would interact with your database here
  
  const getAllItems = async (req, res) => {
    try {
      // Demo data - replace with actual DB query
      const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      res.status(200).json({ items });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get items' });
    }
  };
  
  const getItemById = async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Demo data - replace with actual DB query
      const item = { id, name: \`Item \${id}\` };
      res.status(200).json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get item' });
    }
  };
  
  const createItem = async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }
      // Demo data - replace with actual DB insert
      const newItem = { id: Date.now(), name };
      res.status(201).json(newItem);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create item' });
    }
  };
  
  const updateItem = async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }
      // Demo data - replace with actual DB update
      const updatedItem = { id, name };
      res.status(200).json(updatedItem);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update item' });
    }
  };
  
  const deleteItem = async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Demo data - replace with actual DB delete
      res.status(200).json({ message: \`Item \${id} deleted successfully\` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete item' });
    }
  };
  
  module.exports = {
    getAllItems,
    getItemById,
    createItem,
    updateItem,
    deleteItem
  };`;
    }
  }

  private static generateModelCode(
    language: "javascript" | "typescript",
    database: string
  ): string {
    if (database === "mongodb") {
      if (language === "typescript") {
        return `import mongoose, { Schema, Document } from 'mongoose';
  
  export interface IItem extends Document {
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  const ItemSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
  }, { timestamps: true });
  
  // Export the model
  export const Item = mongoose.model<IItem>('Item', ItemSchema);`;
      } else {
        return `const mongoose = require('mongoose');
  const { Schema } = mongoose;
  
  const ItemSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
  }, { timestamps: true });
  
  // Export the model
  const Item = mongoose.model('Item', ItemSchema);
  
  module.exports = {
    Item
  };`;
      }
    } else if (database === "postgres" || database === "mysql") {
      if (language === "typescript") {
        return `// Example model for SQL databases (PostgreSQL/MySQL)
  // This would typically be implemented with an ORM like Sequelize or TypeORM
  // Here's a simple placeholder that could be expanded for your specific needs
  
  export interface IItem {
    id?: number;
    name: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  export class ItemModel {
    // Method to get all items
    static async findAll(): Promise<IItem[]> {
      // Implement with your SQL client or ORM
      return [];
    }
  
    // Method to get item by id
    static async findById(id: number): Promise<IItem | null> {
      // Implement with your SQL client or ORM
      return null;
    }
  
    // Method to create an item
    static async create(data: IItem): Promise<IItem> {
      // Implement with your SQL client or ORM
      return { ...data, id: Date.now() };
    }
  
    // Method to update an item
    static async update(id: number, data: IItem): Promise<IItem | null> {
      // Implement with your SQL client or ORM
      return { ...data, id };
    }
  
    // Method to delete an item
    static async delete(id: number): Promise<boolean> {
      // Implement with your SQL client or ORM
      return true;
    }
  }`;
      } else {
        return `// Example model for SQL databases (PostgreSQL/MySQL)
  // This would typically be implemented with an ORM like Sequelize or Knex
  // Here's a simple placeholder that could be expanded for your specific needs
  
  class ItemModel {
    // Method to get all items
    static async findAll() {
      // Implement with your SQL client or ORM
      return [];
    }
  
    // Method to get item by id
    static async findById(id) {
      // Implement with your SQL client or ORM
      return null;
    }
  
    // Method to create an item
    static async create(data) {
      // Implement with your SQL client or ORM
      return { ...data, id: Date.now() };
    }
  
    // Method to update an item
    static async update(id, data) {
      // Implement with your SQL client or ORM
      return { ...data, id };
    }
  
    // Method to delete an item
    static async delete(id) {
      // Implement with your SQL client or ORM
      return true;
    }
  }
  
  module.exports = {
    ItemModel
  };`;
      }
    } else if (database === "sqlite") {
      if (language === "typescript") {
        return `import sqlite3 from 'sqlite3';
  import { promisify } from 'util';
  import path from 'path';
  
  // Create a SQLite database instance
  const db = new sqlite3.Database(path.resolve(__dirname, '../database.sqlite'));
  
  // Promisify SQLite methods
  const run = promisify(db.run.bind(db));
  const get = promisify(db.get.bind(db));
  const all = promisify(db.all.bind(db));
  
  // Initialize the database with tables
  const initializeDatabase = async (): Promise<void> => {
    await run(\`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \`);
  };
  
  export interface IItem {
    id?: number;
    name: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
  }
  
  export class ItemModel {
    static async findAll(): Promise<IItem[]> {
      return await all('SELECT * FROM items');
    }
  
    static async findById(id: number): Promise<IItem | null> {
      return await get('SELECT * FROM items WHERE id = ?', [id]);
    }
  
    static async create(data: IItem): Promise<IItem> {
      const result = await run(
        'INSERT INTO items (name, description) VALUES (?, ?)',
        [data.name, data.description || null]
      );
      return { ...data, id: result.lastID };
    }
  
    static async update(id: number, data: IItem): Promise<IItem> {
      await run(
        'UPDATE items SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [data.name, data.description || null, id]
      );
      return { ...data, id };
    }
  
    static async delete(id: number): Promise<boolean> {
      await run('DELETE FROM items WHERE id = ?', [id]);
      return true;
    }
  }
  
  // Initialize the database
  initializeDatabase().catch(console.error);
  
  export { db };`;
      } else {
        return `const sqlite3 = require('sqlite3');
  const { promisify } = require('util');
  const path = require('path');
  
  // Create a SQLite database instance
  const db = new sqlite3.Database(path.resolve(__dirname, '../database.sqlite'));
  
  // Promisify SQLite methods
  const run = promisify(db.run.bind(db));
  const get = promisify(db.get.bind(db));
  const all = promisify(db.all.bind(db));
  
  // Initialize the database with tables
  const initializeDatabase = async () => {
    await run(\`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \`);
  };
  
  class ItemModel {
    static async findAll() {
      return await all('SELECT * FROM items');
    }
  
    static async findById(id) {
      return await get('SELECT * FROM items WHERE id = ?', [id]);
    }
  
    static async create(data) {
      const result = await run(
        'INSERT INTO items (name, description) VALUES (?, ?)',
        [data.name, data.description || null]
      );
      return { ...data, id: result.lastID };
    }
  
    static async update(id, data) {
      await run(
        'UPDATE items SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [data.name, data.description || null, id]
      );
      return { ...data, id };
    }
  
    static async delete(id) {
      await run('DELETE FROM items WHERE id = ?', [id]);
      return true;
    }
  }
  
  // Initialize the database
  initializeDatabase().catch(console.error);
  
  module.exports = {
    db,
    ItemModel
  };`;
      }
    } else {
      // Default or "none" case
      if (language === "typescript") {
        return `// This is a placeholder model for a project without a database
  // You would typically replace this with actual database models
  
  export interface IItem {
    id: number;
    name: string;
    description?: string;
  }
  
  // In-memory store for demo purposes
  const items: IItem[] = [
    { id: 1, name: 'Item 1', description: 'First item' },
    { id: 2, name: 'Item 2', description: 'Second item' },
  ];
  
  export class ItemModel {
    static async findAll(): Promise<IItem[]> {
      return [...items];
    }
  
    static async findById(id: number): Promise<IItem | undefined> {
      return items.find(item => item.id === id);
    }
  
    static async create(data: Omit<IItem, 'id'>): Promise<IItem> {
      const newItem = {
        ...data,
        id: items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1
      };
      items.push(newItem);
      return newItem;
    }
  
    static async update(id: number, data: Partial<IItem>): Promise<IItem | undefined> {
      const index = items.findIndex(item => item.id === id);
      if (index === -1) return undefined;
      
      items[index] = { ...items[index], ...data };
      return items[index];
    }
  
    static async delete(id: number): Promise<boolean> {
      const index = items.findIndex(item => item.id === id);
      if (index === -1) return false;
      
      items.splice(index, 1);
      return true;
    }
  }`;
      } else {
        return `// This is a placeholder model for a project without a database
  // You would typically replace this with actual database models
  
  // In-memory store for demo purposes
  const items = [
    { id: 1, name: 'Item 1', description: 'First item' },
    { id: 2, name: 'Item 2', description: 'Second item' },
  ];
  
  class ItemModel {
    static async findAll() {
      return [...items];
    }
  
    static async findById(id) {
      return items.find(item => item.id === id);
    }
  
    static async create(data) {
      const newItem = {
        ...data,
        id: items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1
      };
      items.push(newItem);
      return newItem;
    }
  
    static async update(id, data) {
      const index = items.findIndex(item => item.id === id);
      if (index === -1) return undefined;
      
      items[index] = { ...items[index], ...data };
      return items[index];
    }
  
    static async delete(id) {
      const index = items.findIndex(item => item.id === id);
      if (index === -1) return false;
      
      items.splice(index, 1);
      return true;
    }
  }
  
  module.exports = {
    ItemModel
  };`;
      }
    }
  }

  private static generateDBConfigCode(
    language: "javascript" | "typescript",
    database: string
  ): string {
    if (database === "mongodb") {
      if (language === "typescript") {
        return `import mongoose from 'mongoose';
  
  export const connectToDatabase = async (): Promise<typeof mongoose> => {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/my_database';
    
    try {
      const connection = await mongoose.connect(mongoURI);
      console.log('MongoDB connection established successfully');
      return connection;
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  };`;
      } else {
        return `const mongoose = require('mongoose');
  
  const connectToDatabase = async () => {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/my_database';
    
    try {
      const connection = await mongoose.connect(mongoURI);
      console.log('MongoDB connection established successfully');
      return connection;
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  };
  
  module.exports = {
    connectToDatabase
  };`;
      }
    } else if (database === "postgres") {
      if (language === "typescript") {
        return `import { Pool } from 'pg';
  
  // Create a pool for PostgreSQL connections
  const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    port: parseInt(process.env.PGPORT || '5432'),
  });
  
  export const connectToDatabase = async (): Promise<Pool> => {
    try {
      const client = await pool.connect();
      client.release();
      console.log('PostgreSQL connection established successfully');
      return pool;
    } catch (error) {
      console.error('Error connecting to PostgreSQL:', error);
      throw error;
    }
  };
  
  export { pool };`;
      } else {
        return `const { Pool } = require('pg');
  
  // Create a pool for PostgreSQL connections
  const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    port: parseInt(process.env.PGPORT || '5432'),
  });
  
  const connectToDatabase = async () => {
    try {
      const client = await pool.connect();
      client.release();
      console.log('PostgreSQL connection established successfully');
      return pool;
    } catch (error) {
      console.error('Error connecting to PostgreSQL:', error);
      throw error;
    }
  };
  
  module.exports = {
    pool,
    connectToDatabase
  };`;
      }
    } else if (database === "mysql") {
      if (language === "typescript") {
        return `import mysql from 'mysql2/promise';
  
  // Create a connection pool for MySQL
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'my_database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  
  export const connectToDatabase = async (): Promise<mysql.Pool> => {
    try {
      const connection = await pool.getConnection();
      connection.release();
      console.log('MySQL connection established successfully');
      return pool;
    } catch (error) {
      console.error('Error connecting to MySQL:', error);
      throw error;
    }
  };
  
  export { pool };`;
      } else {
        return `const mysql = require('mysql2/promise');
  
  // Create a connection pool for MySQL
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'my_database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  
  const connectToDatabase = async () => {
    try {
      const connection = await pool.getConnection();
      connection.release();
      console.log('MySQL connection established successfully');
      return pool;
    } catch (error) {
      console.error('Error connecting to MySQL:', error);
      throw error;
    }
  };
  
  module.exports = {
    pool,
    connectToDatabase
  };`;
      }
    } else if (database === "sqlite") {
      if (language === "typescript") {
        return `import sqlite3 from 'sqlite3';
  import path from 'path';
  
  const dbPath = path.resolve(__dirname, '../../database.sqlite');
  
  export const connectToDatabase = async (): Promise<sqlite3.Database> => {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error connecting to SQLite database:', err);
          reject(err);
        } else {
          console.log('SQLite connection established successfully at', dbPath);
          resolve(db);
        }
      });
    });
  };
  
  export const closeDatabase = (db: sqlite3.Database): Promise<void> => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          console.error('Error closing SQLite database:', err);
          reject(err);
        } else {
          console.log('SQLite connection closed');
          resolve();
        }
      });
    });
  };`;
      } else {
        return `const sqlite3 = require('sqlite3');
  const path = require('path');
  
  const dbPath = path.resolve(__dirname, '../../database.sqlite');
  
  const connectToDatabase = async () => {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error connecting to SQLite database:', err);
          reject(err);
        } else {
          console.log('SQLite connection established successfully at', dbPath);
          resolve(db);
        }
      });
    });
  };
  
  const closeDatabase = (db) => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          console.error('Error closing SQLite database:', err);
          reject(err);
        } else {
          console.log('SQLite connection closed');
          resolve();
        }
      });
    });
  };
  
  module.exports = {
    connectToDatabase,
    closeDatabase
  };`;
      }
    } else {
      // Default or "none" case
      if (language === "typescript") {
        return `// This is a placeholder for projects without a database
  // In a real application, you would connect to your database here
  
  export const connectToDatabase = async (): Promise<void> => {
    console.log('No database configured. Using in-memory storage.');
    return Promise.resolve();
  };`;
      } else {
        return `// This is a placeholder for projects without a database
  // In a real application, you would connect to your database here
  
  const connectToDatabase = async () => {
    console.log('No database configured. Using in-memory storage.');
    return Promise.resolve();
  };
  
  module.exports = {
    connectToDatabase
  };`;
      }
    }
  }
  private static generateBasicTSConfig(): string {
    return JSON.stringify(
      {
        compilerOptions: {
          target: "es5",
          module: "commonjs",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          outDir: "./dist",
        },
        include: ["src/**/*"],
      },
      null,
      2
    );
  }

  private static generateWebpackConfig(
    language: "javascript" | "typescript",
    styling: string
  ): string {
    let config = `const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index${language === "typescript" ? ".ts" : ".js"}',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [`;

    if (language === "typescript") {
      config += `
      {
        test: /\\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },`;
    }

    if (styling === "scss") {
      config += `
      {
        test: /\\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      },`;
    } else if (styling === "tailwind" || styling === "css") {
      config += `
      {
        test: /\\.css$/,
        use: ['style-loader', 'css-loader'${
          styling === "tailwind" ? ", 'postcss-loader'" : ""
        }]
      },`;
    }

    config += `
    ]
  },`;

    if (language === "typescript") {
      config += `
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },`;
    }

    config += `
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 8080,
    open: true
  }
};`;

    return config;
  }

  private static generateVanillaHTML(name: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
</head>
<body>
  <div id="app">
    <h1>${name}</h1>
    <p>Welcome to your new project!</p>
  </div>
</body>
</html>`;
  }

  private static generateVanillaJS(
    language: "javascript" | "typescript"
  ): string {
    if (language === "typescript") {
      return `document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  
  if (app) {
    const button = document.createElement('button');
    button.textContent = 'Click me';
    button.addEventListener('click', () => {
      alert('Button clicked!');
    });
    
    app.appendChild(button);
  }
});

export {};`;
    } else {
      return `document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  
  if (app) {
    const button = document.createElement('button');
    button.textContent = 'Click me';
    button.addEventListener('click', () => {
      alert('Button clicked!');
    });
    
    app.appendChild(button);
  }
});`;
    }
  }

  private static generateTailwindConfig(): string {
    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};`;
  }

  private static generateExpressServerCode(
    language: "javascript" | "typescript",
    database?: string
  ): string {
    if (language === "typescript") {
      let code = `import express, { Express, Request, Response } from 'express';
import routes from './routes';
`;

      if (database && database !== "none") {
        code += `import { connectToDatabase } from './config/database';
`;
      }

      code += `
const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', routes);

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server is running');
});

`;

      if (database && database !== "none") {
        code += `// Connect to database
connectToDatabase().then(() => {
  app.listen(port, () => {
    console.log(\`[server]: Server is running at http://localhost:\${port}\`);
  });
}).catch(error => {
  console.error('Failed to connect to the database', error);
  process.exit(1);
});
`;
      } else {
        code += `app.listen(port, () => {
  console.log(\`[server]: Server is running at http://localhost:\${port}\`);
});
`;
      }

      return code;
    } else {
      let code = `const express = require('express');
const routes = require('./routes');
`;

      if (database && database !== "none") {
        code += `const { connectToDatabase } = require('./config/database');
`;
      }

      code += `
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('Express Server is running');
});

`;

      if (database && database !== "none") {
        code += `// Connect to database
connectToDatabase().then(() => {
  app.listen(port, () => {
    console.log(\`[server]: Server is running at http://localhost:\${port}\`);
  });
}).catch(error => {
  console.error('Failed to connect to the database', error);
  process.exit(1);
});
`;
      } else {
        code += `app.listen(port, () => {
  console.log(\`[server]: Server is running at http://localhost:\${port}\`);
});
`;
      }

      return code;
    }
  }

  private static generateFastifyServerCode(
    language: "javascript" | "typescript",
    database?: string
  ): string {
    if (language === "typescript") {
      let code = `import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
`;

      if (database && database !== "none") {
        code += `import { connectToDatabase } from './config/database';
`;
      }

      code += `
const server: FastifyInstance = fastify({ logger: true });
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Register routes
server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
  return { message: 'Fastify + TypeScript Server is running' };
});

// Items routes
server.get('/api/items', async (request: FastifyRequest, reply: FastifyReply) => {
  return { items: [] }; // Replace with actual data fetching
});

server.get('/api/items/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  const { id } = request.params;
  return { id, name: \`Item \${id}\` }; // Replace with actual data fetching
});

server.post('/api/items', async (request: FastifyRequest<{ Body: { name: string } }>, reply: FastifyReply) => {
  const { name } = request.body;
  if (!name) {
    reply.code(400).send({ error: 'Name is required' });
    return;
  }
  return { id: Date.now(), name }; // Replace with actual data insertion
});

// Start the server
const start = async () => {
  try {
`;

      if (database && database !== "none") {
        code += `    // Connect to database
    await connectToDatabase();
`;
      }

      code += `    await server.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
`;

      return code;
    } else {
      let code = `const fastify = require('fastify')({ logger: true });
`;

      if (database && database !== "none") {
        code += `const { connectToDatabase } = require('./config/database');
`;
      }

      code += `
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Register routes
fastify.get('/', async (request, reply) => {
  return { message: 'Fastify Server is running' };
});

// Items routes
fastify.get('/api/items', async (request, reply) => {
  return { items: [] }; // Replace with actual data fetching
});

fastify.get('/api/items/:id', async (request, reply) => {
  const { id } = request.params;
  return { id, name: \`Item \${id}\` }; // Replace with actual data fetching
});

fastify.post('/api/items', async (request, reply) => {
  const { name } = request.body;
  if (!name) {
    reply.code(400).send({ error: 'Name is required' });
    return;
  }
  return { id: Date.now(), name }; // Replace with actual data insertion
});

// Start the server
const start = async () => {
  try {
`;

      if (database && database !== "none") {
        code += `    // Connect to database
    await connectToDatabase();
`;
      }

      code += `    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
`;

      return code;
    }
  }

  private static generateKoaServerCode(
    language: "javascript" | "typescript",
    database?: string
  ): string {
    if (language === "typescript") {
      let code = `import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
`;

      if (database && database !== "none") {
        code += `import { connectToDatabase } from './config/database';
`;
      }

      code += `
const app = new Koa();
const router = new Router();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Middleware
app.use(bodyParser());

// Routes
router.get('/', (ctx) => {
  ctx.body = { message: 'Koa + TypeScript Server is running' };
});

// Items routes
router.get('/api/items', (ctx) => {
  ctx.body = { items: [] }; // Replace with actual data fetching
});

router.get('/api/items/:id', (ctx) => {
  const { id } = ctx.params;
  ctx.body = { id, name: \`Item \${id}\` }; // Replace with actual data fetching
});

router.post('/api/items', (ctx) => {
  const { name } = ctx.request.body as { name: string };
  if (!name) {
    ctx.status = 400;
    ctx.body = { error: 'Name is required' };
    return;
  }
  ctx.body = { id: Date.now(), name }; // Replace with actual data insertion
});

// Register routes
app.use(router.routes()).use(router.allowedMethods());

// Start server
const start = async () => {
  try {
`;

      if (database && database !== "none") {
        code += `    // Connect to database
    await connectToDatabase();
`;
      }

      code += `    app.listen(port, () => {
      console.log(\`[server]: Server is running at http://localhost:\${port}\`);
    });
  } catch (err) {
    console.error('Server error:', err);
  }
};

start();
`;

      return code;
    } else {
      let code = `const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
`;

      if (database && database !== "none") {
        code += `const { connectToDatabase } = require('./config/database');
`;
      }

      code += `
const app = new Koa();
const router = new Router();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Middleware
app.use(bodyParser());

// Routes
router.get('/', (ctx) => {
  ctx.body = { message: 'Koa Server is running' };
});

// Items routes
router.get('/api/items', (ctx) => {
  ctx.body = { items: [] }; // Replace with actual data fetching
});

router.get('/api/items/:id', (ctx) => {
  const { id } = ctx.params;
  ctx.body = { id, name: \`Item \${id}\` }; // Replace with actual data fetching
});

router.post('/api/items', (ctx) => {
  const { name } = ctx.request.body;
  if (!name) {
    ctx.status = 400;
    ctx.body = { error: 'Name is required' };
    return;
  }
  ctx.body = { id: Date.now(), name }; // Replace with actual data insertion
});

// Register routes
app.use(router.routes()).use(router.allowedMethods());

// Start server
const start = async () => {
  try {
`;

      if (database && database !== "none") {
        code += `    // Connect to database
    await connectToDatabase();
`;
      }

      code += `    app.listen(port, () => {
      console.log(\`[server]: Server is running at http://localhost:\${port}\`);
    });
  } catch (err) {
    console.error('Server error:', err);
  }
};

start();
`;

      return code;
    }
  }

  private static generateHapiServerCode(
    language: "javascript" | "typescript",
    database?: string
  ): string {
    if (language === "typescript") {
      let code = `import Hapi from '@hapi/hapi';
`;

      if (database && database !== "none") {
        code += `import { connectToDatabase } from './config/database';
`;
      }

      code += `
const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: '0.0.0.0'
  });

  // Routes
  server.route({
    method: 'GET',
    path: '/',
    handler: () => {
      return { message: 'Hapi + TypeScript Server is running' };
    }
  });

  server.route({
    method: 'GET',
    path: '/api/items',
    handler: () => {
      return { items: [] }; // Replace with actual data fetching
    }
  });

  server.route({
    method: 'GET',
    path: '/api/items/{id}',
    handler: (request) => {
      const id = request.params.id;
      return { id, name: \`Item \${id}\` }; // Replace with actual data fetching
    }
  });

  server.route({
    method: 'POST',
    path: '/api/items',
    handler: (request, h) => {
      const { name } = request.payload as { name: string };
      if (!name) {
        return h.response({ error: 'Name is required' }).code(400);
      }
      return { id: Date.now(), name }; // Replace with actual data insertion
    }
  });

  try {
`;

      if (database && database !== "none") {
        code += `    // Connect to database
    await connectToDatabase();
`;
      }

      code += `    await server.start();
    console.log(\`Server running at: \${server.info.uri}\`);
  } catch (err) {
    console.error('Server error:', err);
  }
};

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

init();
`;
    } else {
      let code = `const Hapi = require('@hapi/hapi');
`;

      if (database && database !== "none") {
        code += `const { connectToDatabase } = require('./config/database');
`;
      }

      code += `
const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: '0.0.0.0'
  });

  // Routes
  server.route({
    method: 'GET',
    path: '/',
    handler: () => {
      return { message: 'Hapi Server is running' };
    }
  });

  server.route({
    method: 'GET',
    path: '/api/items',
    handler: () => {
      return { items: [] }; // Replace with actual data fetching
    }
  });

  server.route({
    method: 'GET',
    path: '/api/items/{id}',
    handler: (request) => {
      const id = request.params.id;
      return { id, name: \`Item \${id}\` }; // Replace with actual data fetching
    }
  });

  server.route({
    method: 'POST',
    path: '/api/items',
    handler: (request, h) => {
      const { name } = request.payload;
      if (!name) {
        return h.response({ error: 'Name is required' }).code(400);
      }
      return { id: Date.now(), name }; // Replace with actual data insertion
    }
  });

  try {
`;

      if (database && database !== "none") {
        code += `    // Connect to database
    await connectToDatabase();
`;
      }

      code += `    await server.start();
    console.log(\`Server running at: \${server.info.uri}\`);
  } catch (err) {
    console.error('Server error:', err);
  }
};

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

init();
`;
      return code;
    }
  }
}
